# syntax=docker/dockerfile:1

# ---------- build: dependencies only, so no compiler or pip cache reaches the runtime image ----------
FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
COPY requirements.txt .
RUN python -m venv /opt/venv \
 && /opt/venv/bin/pip install --upgrade pip \
 && /opt/venv/bin/pip install -r requirements.txt

# ---------- runtime ----------
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    # The image refuses to boot without a real ZUBIE_SECRET_KEY and ZUBIE_CORS_ORIGINS.
    ZUBIE_ENVIRONMENT=production \
    # Proxy IPs allowed to set X-Forwarded-For. Without this every client shares one rate-limit bucket.
    FORWARDED_ALLOW_IPS=127.0.0.1

RUN groupadd --system --gid 10001 zubie \
 && useradd --system --uid 10001 --gid zubie --no-create-home --shell /usr/sbin/nologin zubie

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY app ./app

USER 10001:10001
EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=5 \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"]

# One worker on purpose: the login rate limiter and token revocation list live in process memory.
# Move both to Redis before raising it. The app writes its own structured access log, so uvicorn's is off.
ENTRYPOINT ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips \"$FORWARDED_ALLOW_IPS\" --no-server-header --no-access-log --ws-max-size 65536"]
