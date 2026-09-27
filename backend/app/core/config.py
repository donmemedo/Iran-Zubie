from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, overridable with ZUBIE_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="ZUBIE_", env_file=".env", extra="ignore")

    project_name: str = "Zubie Iran API"
    api_prefix: str = "/api"
    secret_key: str = "zubie-iran-dev-secret-key-not-for-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    database_url: str = "sqlite+aiosqlite:///./zubie.db"
    cors_origins: str = "http://localhost:3010,http://127.0.0.1:3010,http://localhost:3000,http://127.0.0.1:3000"
    # Seconds between simulated telemetry ticks pushed over the websocket.
    telemetry_interval: float = 2.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
