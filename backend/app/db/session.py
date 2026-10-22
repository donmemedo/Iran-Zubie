from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

if settings.database_url.startswith("sqlite"):
    engine = create_async_engine(settings.database_url)

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record) -> None:
        # WAL lets API reads proceed while the telemetry flush writes; NORMAL is crash-safe under WAL.
        cursor = dbapi_connection.cursor()
        for pragma in ("journal_mode=WAL", "synchronous=NORMAL", "foreign_keys=ON"):
            cursor.execute(f"PRAGMA {pragma}")
        cursor.close()

else:
    # ponytail: fixed pool sized for one API process; derive from worker count when scaling out.
    engine = create_async_engine(
        settings.database_url, pool_pre_ping=True, pool_size=10, max_overflow=10, pool_recycle=1800
    )

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
