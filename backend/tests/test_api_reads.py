"""Read paths. The analytics endpoints were rewritten from full-table loads to SQL aggregates, so
these tests pin them to the plain list endpoints: the aggregate numbers must agree with the rows."""

import pytest

READ_ENDPOINTS = [
    "/api/vehicles",
    "/api/drivers",
    "/api/trips",
    "/api/alerts",
    "/api/geofences",
    "/api/maintenance",
    "/api/analytics/overview",
    "/api/analytics/timeseries",
    "/api/analytics/alert-mix",
    "/api/analytics/score-distribution",
    "/api/analytics/maintenance-forecast",
    "/api/public/plans",
]


@pytest.mark.parametrize("path", READ_ENDPOINTS)
def test_every_read_endpoint_answers(client, demo, path):
    assert client.get(path, headers=demo).status_code == 200


def test_overview_agrees_with_the_lists(client, demo):
    overview = client.get("/api/analytics/overview", headers=demo).json()
    vehicles = client.get("/api/vehicles", headers=demo).json()
    alerts = client.get("/api/alerts?only_open=true&limit=200", headers=demo).json()
    assert overview["total_vehicles"] == len(vehicles) > 0
    by_state = ("moving", "idle", "parked", "offline", "in_service")
    assert sum(overview[k] for k in by_state) == len(vehicles)
    assert overview["open_alerts"] == len(alerts)
    assert overview["critical_alerts"] == sum(a["severity"] == "critical" for a in alerts)


def test_score_bands_cover_every_driver_once(client, demo):
    drivers = client.get("/api/drivers", headers=demo).json()
    bands = client.get("/api/analytics/score-distribution", headers=demo).json()
    assert sum(b["count"] for b in bands) == len(drivers) > 0


def test_alert_mix_and_maintenance_forecast_add_up(client, demo):
    alerts = client.get("/api/alerts?limit=200", headers=demo).json()
    assert len(alerts) < 200  # otherwise the list is truncated and the comparison is meaningless
    mix = client.get("/api/analytics/alert-mix", headers=demo).json()
    assert sum(m["count"] for m in mix) == len(alerts)

    tasks = client.get("/api/maintenance", headers=demo).json()
    forecast = client.get("/api/analytics/maintenance-forecast", headers=demo).json()
    assert sum(forecast[k] for k in ("overdue", "due", "upcoming", "done")) == len(tasks)
    assert forecast["open_cost_toman"] == sum(t["cost_toman"] for t in tasks if t["status"] != "done")


@pytest.mark.parametrize("days", [14, 30])
def test_timeseries_has_one_point_per_day(client, demo, days):
    series = client.get(f"/api/analytics/timeseries?days={days}", headers=demo).json()
    assert len(series["points"]) == days
    assert set(series["keys"]) == set(series["points"][0]["values"])


def test_vehicle_filters_run_in_sql_and_agree_with_the_rows(client, demo):
    vehicles = client.get("/api/vehicles", headers=demo).json()
    moving = client.get("/api/vehicles?status=moving", headers=demo).json()
    assert moving and all(v["status"] == "moving" for v in moving)
    assert len(client.get("/api/vehicles?status=all", headers=demo).json()) == len(vehicles)

    target = vehicles[0]
    found = client.get("/api/vehicles", params={"search": target["plate_en"].upper()}, headers=demo).json()
    assert target["id"] in {v["id"] for v in found}
    assert client.get("/api/vehicles", params={"search": "no-such-vehicle-xyz"}, headers=demo).json() == []


def test_trip_and_alert_and_maintenance_filters(client, demo):
    assert len(client.get("/api/trips?limit=3", headers=demo).json()) <= 3
    vehicle_id = client.get("/api/vehicles", headers=demo).json()[0]["id"]
    assert client.get(f"/api/vehicles/{vehicle_id}/trips", headers=demo).status_code == 200
    critical = client.get("/api/alerts?severity=critical", headers=demo).json()
    assert all(a["severity"] == "critical" for a in critical)
    due = client.get("/api/maintenance?status=due", headers=demo).json()
    assert all(t["status"] == "due" for t in due)


def test_unknown_ids_are_404_not_500(client, demo):
    for path in ("/api/vehicles/999999", "/api/drivers/999999"):
        assert client.get(path, headers=demo).status_code == 404
    assert client.get("/api/vehicles/999999/diagnostics", headers=demo).status_code == 404
