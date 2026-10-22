import time
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings

# bcrypt only reads the first 72 bytes; bcrypt>=5 raises instead of truncating.
MAX_PASSWORD_BYTES = 72
REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub", "jti"]

# Verified against when the account does not exist or the password is unusable, so
# every failed login costs the same bcrypt work and the response time reveals nothing.
_DUMMY_HASH = bcrypt.hashpw(b"zubie-timing-equaliser", bcrypt.gensalt())

# jti -> exp (unix seconds) of tokens revoked by logout.
# ponytail: per-process memory, lost on restart and not shared between workers; move it to
# Redis together with the rate limiter when the API runs on more than one process.
_revoked: dict[str, float] = {}
_purge_at = 1024  # purge expired entries only when the denylist doubles: O(1) amortised per logout


def hash_password(password: str) -> str:
    raw = password.encode()
    if len(raw) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes")
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str | None) -> bool:
    raw = plain.encode()
    if hashed is None or len(raw) > MAX_PASSWORD_BYTES:
        bcrypt.checkpw(b"zubie-timing-equaliser", _DUMMY_HASH)
        return False
    return bcrypt.checkpw(raw, hashed.encode())


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes or settings.access_token_expire_minutes),
        "iss": settings.token_issuer,
        "aud": settings.token_audience,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def token_claims(token: str) -> dict | None:
    """Verified claims, or None when the token is invalid, expired or revoked."""
    try:
        claims = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            audience=settings.token_audience,
            issuer=settings.token_issuer,
            options={"require": REQUIRED_CLAIMS},
        )
    except jwt.PyJWTError:
        return None
    # PyJWT already rejects a non-string sub or jti.
    return None if claims["jti"] in _revoked else claims


def decode_access_token(token: str) -> str | None:
    """Return the subject (user email) or None when the token is unusable."""
    claims = token_claims(token)
    return claims["sub"] if claims else None


def revoke_token(claims: dict) -> None:
    """Deny this token's jti until it would have expired anyway."""
    global _purge_at
    if len(_revoked) >= _purge_at:  # entries past exp can no longer validate anyway
        now = time.time()
        for jti in [j for j, exp in _revoked.items() if exp <= now]:
            del _revoked[jti]
        _purge_at = max(1024, 2 * len(_revoked))
    _revoked[claims["jti"]] = float(claims["exp"])


if __name__ == "__main__":  # self-check: cd backend && .venv/bin/python -m app.core.security
    assert verify_password("zubie1234", hash_password("zubie1234"))
    assert not verify_password("x" * 73, None) and not verify_password("x" * 73, _DUMMY_HASH.decode())
    t = create_access_token("a@b.c")
    assert decode_access_token(t) == "a@b.c" and decode_access_token(t + "x") is None
    claims = token_claims(t)
    assert claims is not None
    revoke_token(claims)
    assert token_claims(t) is None and decode_access_token(create_access_token("a@b.c")) == "a@b.c"
    print("security ok")
