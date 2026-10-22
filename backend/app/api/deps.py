from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import token_claims
from app.db.session import get_session
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/token", auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

ROLE_RANK = {"viewer": 0, "manager": 1, "admin": 2}


async def user_from_token(token: str | None, session: AsyncSession) -> User | None:
    """The token's user, or None when the token is missing, invalid, expired or revoked."""
    claims = token_claims(token) if token else None
    if claims is None:
        return None
    return await session.scalar(
        select(User).options(selectinload(User.organization)).where(User.email == claims["sub"])
    )


async def current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    user = await user_from_token(token, session)
    if user is None:
        raise CREDENTIALS_ERROR
    return user


def require_role(minimum: str):
    """Dependency: the caller must hold at least `minimum` role (viewer < manager < admin)."""
    rank = ROLE_RANK[minimum]  # a typo fails at import, not on the first request

    async def dependency(user: User = Depends(current_user)) -> User:
        if ROLE_RANK.get(user.role, -1) < rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires the {minimum} role",
            )
        return user

    return dependency
