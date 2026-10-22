"""In-process sliding-window rate limiter (stdlib only).

ponytail: per-process memory, correct for a single uvicorn worker; move the
counters to Redis when the API runs on more than one process. Memory is capped at
max_keys keys of at most `limit` timestamps each; past that the least recently hit
key is dropped, so a flood of fresh keys can reset a cold counter but never grow memory.
"""

import time
from collections import OrderedDict, deque

from fastapi import HTTPException, Request, status


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float, max_keys: int = 10_000) -> None:
        self.limit = limit
        self.window = window_seconds
        self.max_keys = max_keys
        self._hits: OrderedDict[str, deque[float]] = OrderedDict()  # least recently hit first

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits.get(key)
        if hits is None:
            hits = self._hits[key] = deque()
            if len(self._hits) > self.max_keys:
                self._hits.popitem(last=False)
        else:
            self._hits.move_to_end(key)
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            retry_after = int(hits[0] + self.window - now) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests, please try again later",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)


def rate_limit(name: str, limit: int, window_seconds: float):
    """FastAPI dependency limiting a route per client IP."""
    limiter = RateLimiter(limit, window_seconds)

    async def dependency(request: Request) -> None:
        limiter.check(f"{name}:{client_ip(request)}")

    return dependency


if __name__ == "__main__":  # self-check: cd backend && .venv/bin/python -m app.core.ratelimit
    rl = RateLimiter(limit=2, window_seconds=60, max_keys=3)
    rl.check("a")
    rl.check("a")
    try:
        rl.check("a")
        raise AssertionError("third hit inside the window must be refused")
    except HTTPException as e:
        assert e.headers is not None and e.status_code == 429 and int(e.headers["Retry-After"]) > 0
    for k in range(1000):
        rl.check(f"flood{k}")
    assert len(rl._hits) == 3 and "a" not in rl._hits
    print("ratelimit ok")
