from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "zubie-iran-dev-secret-key-not-for-production"
# Placeholder values that ship in .env.example / docker-compose; never acceptable in production.
WEAK_SECRETS = {
    DEV_SECRET,
    "change-me-in-production",
    "change-me-in-production-please",
    "please-change-this-to-a-long-random-string",
}


class Settings(BaseSettings):
    """Runtime configuration, overridable with ZUBIE_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="ZUBIE_", env_file=".env", extra="ignore")

    project_name: str = "Zubie Iran API"
    api_prefix: str = "/api"
    environment: Literal["development", "production"] = "development"
    secret_key: str = DEV_SECRET
    algorithm: str = "HS256"
    token_issuer: str = "zubie-iran"
    token_audience: str = "zubie-dashboard"
    # One working day. There is no refresh token; the dashboard re-authenticates when it expires.
    access_token_expire_minutes: int = 60 * 8
    database_url: str = "sqlite+aiosqlite:///./zubie.db"
    cors_origins: str = "http://localhost:3010,http://127.0.0.1:3010,http://localhost:3000,http://127.0.0.1:3000"
    # Seconds between simulated telemetry ticks pushed over the websocket.
    telemetry_interval: float = 2.0
    max_ws_connections: int = 500  # global cap; each user is also limited to 10 sockets
    max_body_bytes: int = 256 * 1024  # larger requests get 413 before the body is read
    docs_enabled: bool | None = None  # None -> on in development, off in production

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def show_docs(self) -> bool:
        return (not self.is_production) if self.docs_enabled is None else self.docs_enabled

    @model_validator(mode="after")
    def _refuse_insecure_production(self) -> "Settings":
        if self.is_production:
            if self.secret_key in WEAK_SECRETS or len(self.secret_key) < 32:
                raise ValueError(
                    "ZUBIE_SECRET_KEY must be a random string of at least 32 characters in production "
                    "(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
                )
            if not self.cors_origin_list or "*" in self.cors_origin_list:
                raise ValueError("ZUBIE_CORS_ORIGINS must list the dashboard origin(s) in production, not *")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
