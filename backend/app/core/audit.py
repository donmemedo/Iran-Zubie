"""Audit trail for security-relevant mutations on the "zubie.audit" logger.

ponytail: log lines only; ship them to append-only storage (or an audit table)
when compliance needs tamper evidence.
"""

import logging
from contextvars import ContextVar

log = logging.getLogger("zubie.audit")

# Set per HTTP request by the edge middleware in app.main, so audit lines join the access log.
request_id: ContextVar[str] = ContextVar("request_id", default="-")


def audit(event: str, user, **fields) -> None:
    """audit("geofence.delete", user, geofence_id=7) -> one key=value line."""
    extra = "".join(f" {key}={value!r}" for key, value in fields.items())
    log.info(
        "event=%s user=%s org=%s role=%s rid=%s%s",
        event, user.id, user.organization_id, user.role, request_id.get(), extra,
    )
