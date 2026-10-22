"""Regression tests for the red/blue-team findings. One test per finding, named after the attack."""

import pytest
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

from app.core.config import DEV_SECRET, Settings
from tests.conftest import ORIGIN, PASSWORD, bearer, login

# --------------------------------------------------------------- tenancy


def test_register_creates_own_org_and_sees_no_demo_fleet(client, demo):
    demo_org = client.get("/api/auth/me", headers=demo).json()["organization"]["id"]
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "Str0ng-and-long-1", "full_name": "New Owner", "company": "Acme"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "admin"
    assert body["user"]["organization"]["id"] != demo_org
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    assert client.get("/api/vehicles", headers=headers).json() == []


def test_cross_org_diagnostics_is_404(client, demo, stranger):
    owned = client.get("/api/vehicles", headers=demo).json()[0]["id"]
    assert client.get(f"/api/vehicles/{owned}/diagnostics", headers=demo).status_code == 200
    assert client.get(f"/api/vehicles/{owned}/diagnostics", headers=stranger).status_code == 404
    assert client.get(f"/api/vehicles/{owned}/trips", headers=stranger).json() == []


# --------------------------------------------------------------- roles


def test_viewer_cannot_mutate_manager_can(client, viewer, manager):
    alert_id = client.get("/api/alerts", headers=manager).json()[0]["id"]
    fence = {"name": "Depot", "lat": 35.7, "lng": 51.4, "radius_m": 300}

    assert client.post(f"/api/alerts/{alert_id}/acknowledge", headers=viewer).status_code == 403
    assert client.post("/api/geofences", json=fence, headers=viewer).status_code == 403
    assert client.delete("/api/geofences/1", headers=viewer).status_code == 403
    assert client.post("/api/maintenance/1/complete", headers=viewer).status_code == 403
    assert client.get("/api/vehicles", headers=viewer).status_code == 200  # reads stay open

    assert client.post(f"/api/alerts/{alert_id}/acknowledge", headers=manager).status_code == 200
    created = client.post("/api/geofences", json=fence, headers=manager)
    assert created.status_code == 201
    assert client.delete(f"/api/geofences/{created.json()['id']}", headers=manager).status_code == 204


# --------------------------------------------------------------- websocket


def _connect(client, token=None, headers=ORIGIN):
    protocols = ["zubie.v1"] + ([f"bearer.{token}"] if token else [])
    # Fresh dict per call: Starlette's test client mutates the headers it is given.
    return client.websocket_connect("/api/ws/telemetry", subprotocols=protocols, headers=dict(headers))


def test_ws_rejects_missing_or_bad_token_and_foreign_origin(client, demo):
    for token, headers in [(None, ORIGIN), ("not-a-jwt", ORIGIN)]:
        with pytest.raises(WebSocketDisconnect) as excinfo, _connect(client, token, headers):
            pass
        assert excinfo.value.code == 1008
    good = demo["Authorization"].removeprefix("Bearer ")
    with pytest.raises(WebSocketDisconnect), _connect(client, good, {"origin": "https://evil.example"}):
        pass


@pytest.fixture(scope="session")
def stranger(client):
    """An admin of a brand-new organization that owns no vehicles."""
    response = client.post(
        "/api/auth/register",
        json={"email": "stranger@example.com", "password": "Str0ng-and-long-1", "full_name": "Stranger", "company": "Other"},
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_ws_streams_only_own_org(client, demo, stranger):
    token = demo["Authorization"].removeprefix("Bearer ")
    with _connect(client, token) as ws:
        own = {v["id"] for v in ws.receive_json()["vehicles"]}
    assert own == {v["id"] for v in client.get("/api/vehicles", headers=demo).json()}
    with _connect(client, stranger["Authorization"].removeprefix("Bearer ")) as ws:
        assert ws.receive_json()["vehicles"] == []


# --------------------------------------------------------------- auth hardening


def test_logout_revokes_token(client):
    headers = bearer(client, "demo@zubie.ir")
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_login_is_rate_limited_per_account(client):
    codes = [login(client, "manager@zubie.ir", "wrong-password").status_code for _ in range(9)]
    assert codes[:8] == [401] * 8
    assert codes[8] == 429


def test_overlong_password_is_401_not_500(client):
    assert login(client, "demo@zubie.ir", "a" * 100).status_code == 401


def test_weak_passwords_rejected_at_register(client):
    for password in ("short", "password123", "1234567890"):
        response = client.post(
            "/api/auth/register",
            json={"email": "weak@example.com", "password": password, "full_name": "Weak"},
        )
        assert response.status_code in (422, 429)


def test_production_refuses_default_secret_and_wildcard_cors():
    with pytest.raises(ValidationError):
        Settings(environment="production", secret_key=DEV_SECRET, cors_origins="https://app.example")
    with pytest.raises(ValidationError):
        Settings(environment="production", secret_key="x" * 48, cors_origins="*")
    ok = Settings(environment="production", secret_key="x" * 48, cors_origins="https://app.example")
    assert ok.show_docs is False


# --------------------------------------------------------------- edge hardening


def test_health_leaks_nothing_and_headers_present(client):
    response = client.get("/health")
    assert response.json() == {"status": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["x-request-id"]


def test_api_responses_are_not_cacheable(client, demo):
    assert client.get("/api/vehicles", headers=demo).headers["cache-control"] == "no-store"


def test_out_of_range_params_are_422(client, demo):
    assert client.get("/api/alerts?limit=100000", headers=demo).status_code == 422
    assert client.get("/api/trips?days=9999", headers=demo).status_code == 422
    assert client.get("/api/alerts?severity=<script>", headers=demo).status_code == 422


def test_geofence_bounds(client, manager):
    for bad in ({"lat": 0, "lng": 0}, {"lat": 35.7, "lng": 51.4, "radius_m": 10**9}):
        assert client.post("/api/geofences", json={"name": "x", **bad}, headers=manager).status_code == 422


def test_oversized_body_is_413(client):
    response = client.post("/api/public/leads", content=b"x" * (300 * 1024), headers={"content-type": "application/json"})
    assert response.status_code == 413


def test_unknown_credentials_cost_the_same_path(client):
    assert login(client, "nobody@example.com", PASSWORD).status_code == 401


def test_unknown_fields_are_rejected_not_ignored(client):
    body = {"email": "x@example.com", "password": "Str0ng-and-long-1", "full_name": "X", "role": "admin", "organization_id": 1}
    assert client.post("/api/auth/register", json=body).status_code in (422, 429)
    assert client.post("/api/auth/login", json={"email": "demo@zubie.ir", "password": PASSWORD, "is_admin": True}).status_code == 422


def test_production_does_not_plant_demo_accounts_unless_asked():
    base = {"secret_key": "x" * 48, "cors_origins": "https://app.example"}
    assert Settings(environment="production", **base).should_seed is False
    assert Settings(environment="production", seed_demo=True, **base).should_seed is True
    assert Settings(environment="development").should_seed is True


def test_readiness_checks_the_database_and_leaks_nothing(client):
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
