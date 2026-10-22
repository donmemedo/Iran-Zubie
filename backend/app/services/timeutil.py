"""SQLite hands back naive datetimes while Postgres returns aware ones.

Everything the app stores is UTC, so normalise on the way out and compare
against aware values only.
"""

from datetime import UTC, datetime


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value
