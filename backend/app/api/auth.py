import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CREDENTIALS_ERROR, current_user, oauth2_scheme
from app.core.ratelimit import RateLimiter, client_ip, rate_limit
from app.core.security import (
    create_access_token,
    hash_password,
    revoke_token,
    token_claims,
    verify_password,
)
from app.db.session import get_session
from app.models import Organization, User
from app.schemas import LoginRequest, RegisterRequest, TokenOut, UserOut

log = logging.getLogger("zubie.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

_login_per_ip = RateLimiter(limit=20, window_seconds=60)
_login_per_account = RateLimiter(limit=8, window_seconds=300)


async def _load(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(
        select(User).options(selectinload(User.organization)).where(User.email == email.lower())
    )


async def _authenticate(session: AsyncSession, request: Request, email: str, password: str) -> User:
    email = email.lower()
    ip = client_ip(request)
    _login_per_ip.check(f"ip:{ip}")
    _login_per_account.check(f"acct:{email}")
    user = await _load(session, email)
    # bcrypt is CPU-bound; keep it off the event loop. Runs even when the user is unknown.
    ok = await run_in_threadpool(verify_password, password, user.hashed_password if user else None)
    if not ok or user is None:
        log.warning("auth.login.failed email=%s ip=%s", email, ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect"
        )
    log.info("auth.login.ok user_id=%s org_id=%s ip=%s", user.id, user.organization_id, ip)
    return user


@router.post("/login", response_model=TokenOut)
async def login(
    payload: LoginRequest, request: Request, session: AsyncSession = Depends(get_session)
) -> TokenOut:
    user = await _authenticate(session, request, payload.email, payload.password)
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))


@router.post("/token", response_model=TokenOut, include_in_schema=False)
async def token(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
) -> TokenOut:
    """OAuth2 password-flow alias so the /docs "Authorize" button works."""
    user = await _authenticate(session, request, form.username, form.password)
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", limit=5, window_seconds=3600))],
)
async def register(
    payload: RegisterRequest, request: Request, session: AsyncSession = Depends(get_session)
) -> TokenOut:
    if await _load(session, payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="This email is already registered"
        )
    # Every sign-up gets its own organisation. Joining an existing fleet is an
    # invitation from that fleet's admin, never something a public form can do.
    org = Organization(name=payload.company, name_fa=payload.company, plan="basic")
    session.add(org)
    await session.flush()

    user = User(
        email=payload.email.lower(),
        hashed_password=await run_in_threadpool(hash_password, payload.password),
        full_name=payload.full_name,
        full_name_fa=payload.full_name_fa or payload.full_name,
        role="admin",
        organization_id=org.id,
    )
    session.add(user)
    await session.commit()
    user = await _load(session, user.email)
    assert user is not None
    log.info("auth.register user_id=%s org_id=%s ip=%s", user.id, org.id, client_ip(request))
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(token: str | None = Depends(oauth2_scheme)) -> None:
    """Revoke the bearer token server-side so a copied token stops working too.

    A valid signature is the whole authentication here, so no user lookup round trip.
    """
    claims = token_claims(token) if token else None
    if claims is None:
        raise CREDENTIALS_ERROR
    revoke_token(claims)
    log.info("auth.logout sub=%s jti=%s", claims["sub"], claims["jti"])


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user)
