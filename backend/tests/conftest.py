"""Test harness: one app instance on a throwaway SQLite file, seeded by the app's own lifespan."""

import os
import tempfile

# Must be set before `app` is imported: settings are read once at import time.
os.environ["ZUBIE_DATABASE_URL"] = f"sqlite+aiosqlite:///{tempfile.mkdtemp(prefix='zubie-test-')}/test.db"
os.environ["ZUBIE_ENVIRONMENT"] = "development"
os.environ["ZUBIE_CORS_ORIGINS"] = "http://localhost:3010"

import pytest
from starlette.testclient import TestClient

from app.api import auth as auth_module
from app.main import app

PASSWORD = "zubie1234"
ORIGIN = {"origin": "http://localhost:3010"}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_login_limits():
    # The limiters are per-process; clear them so tests do not trip each other.
    auth_module._login_per_ip._hits.clear()
    auth_module._login_per_account._hits.clear()


def login(client: TestClient, email: str, password: str = PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def bearer(client: TestClient, email: str, password: str = PASSWORD) -> dict:
    response = login(client, email, password)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def demo(client):
    return bearer(client, "demo@zubie.ir")


@pytest.fixture(scope="session")
def manager(client):
    return bearer(client, "manager@zubie.ir")


@pytest.fixture(scope="session")
def viewer(client, demo):
    """A read-only user inside the demo organization (the seed has none)."""
    from app.core.security import hash_password
    from app.db.session import SessionLocal
    from app.models import User

    org_id = client.get("/api/auth/me", headers=demo).json()["organization"]["id"]

    async def create():
        async with SessionLocal() as session:
            session.add(
                User(
                    email="viewer@zubie.ir",
                    hashed_password=hash_password(PASSWORD),
                    full_name="Viewer",
                    role="viewer",
                    organization_id=org_id,
                )
            )
            await session.commit()

    client.portal.call(create)
    return bearer(client, "viewer@zubie.ir")
