"""SQLite hands back naive datetimes while Postgres returns aware ones.

Everything the app stores is UTC, so normalise on the way out and compare
against aware values only.
"""

from datetime import datetime, timezone


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
