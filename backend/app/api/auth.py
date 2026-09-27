from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_session
from app.models import Organization, User
from app.schemas import LoginRequest, RegisterRequest, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


async def _load(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(
        select(User).options(selectinload(User.organization)).where(User.email == email.lower())
    )


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)) -> TokenOut:
    user = await _load(session, payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect"
        )
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))


@router.post("/token", response_model=TokenOut, include_in_schema=False)
async def token(
    form: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)
) -> TokenOut:
    """OAuth2 password-flow alias so the /docs "Authorize" button works."""
    return await login(LoginRequest(email=form.username, password=form.password), session)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_session)) -> TokenOut:
    if await _load(session, payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="This email is already registered"
        )
    # New sign-ups join the demo organisation so the dashboard has data on day one.
    org = await session.scalar(select(Organization).limit(1))
    if org is None:
        org = Organization(name=payload.company, name_fa=payload.company, plan="basic")
        session.add(org)
        await session.flush()

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        full_name_fa=payload.full_name_fa or payload.full_name,
        role="manager",
        organization_id=org.id,
    )
    session.add(user)
    await session.commit()
    user = await _load(session, user.email)
    assert user is not None
    return TokenOut(access_token=create_access_token(user.email), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user)
