"""End-to-end integration and API contract tests for the live FastAPI application."""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.api.server import app

client = TestClient(app)


def test_integration_openapi_schema_contracts():
    """Verify OpenAPI 3.1 specification, all 16 registered routes, and two-word schema models."""
    schema = app.openapi()
    assert schema["info"]["title"] == "NE India Flood Logistics API"
    assert len(schema["paths"]) >= 16

    components = schema["components"]["schemas"]
    expected_two_word_schemas = [
        "HealthResponse",
        "CorridorList",
        "CorridorSummary",
        "RouteRisk",
        "ScoreResponse",
        "DispatchResponse",
        "WeatherList",
        "WeatherDetail",
        "WeatherPoint",
        "WeatherRequest",
        "WeatherResponse",
        "WeatherSummary",
        "RainWindow",
        "FogSection",
        "CrosswindSection",
        "RouteLeg",
        "WorstBottleneck",
        "FirstBlocker",
        "StagingNode",
        "DispatchWindow",
        "FleetSummary",
    ]
    for comp in expected_two_word_schemas:
        assert comp in components, f"Missing OpenAPI schema component: {comp}"


def test_integration_docs_ui_accessible():
    """Verify interactive Swagger UI endpoint serves HTML."""
    resp = client.get("/docs")
    assert resp.status_code == 200
    assert "swagger" in resp.text.lower() or "html" in resp.text.lower()


def test_integration_health_and_runs():
    """Verify system health, DB connection, and latest GloFAS forecast pointer."""
    h_resp = client.get("/health")
    assert h_resp.status_code == 200
    health = h_resp.json()
    assert health["ok"] is True
    assert health["latest_run"] >= 1

    r_resp = client.get("/runs/latest")
    assert r_resp.status_code == 200
    run = r_resp.json()
    assert run["run_id"] >= 1


def test_integration_corridors_catalog_and_detail():
    """Verify 37 registered freight corridors and point hydrographs."""
    resp = client.get("/corridors")
    assert resp.status_code == 200
    data = resp.json()
    assert "corridors" in data
    assert len(data["corridors"]) == 37

    detail_resp = client.get("/corridors/31", params={"day": 2})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["corridor_id"] == 31
    assert "points" in detail
    assert len(detail["points"]) >= 3


def test_integration_route_risk_scoring():
    """Verify arbitrary polyline risk evaluation with multi-hazard integration."""
    payload = {
        "points": [[91.74, 26.14], [92.10, 25.70], [92.80, 24.83]],
        "day": 2,
        "vehicle_profile": "heavy_multi_axle",
        "max_samples": 20,
    }
    resp = client.post("/route-risk", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] in ("GO", "CAUTION", "HOLD")
    assert data["action"] in ("PROCEED", "PROCEED_WITH_CAUTION", "REROUTE", "HALT_AND_STAGE")
    assert "legs" in data
    assert len(data["legs"]) >= 3


def test_integration_score_routes_pareto():
    """Verify lexicographical Pareto ranking between competing candidate trajectories."""
    payload = {
        "routes": [
            {"route_id": "nh6_direct", "points": [[91.74, 26.14], [92.80, 24.83]]},
            {"route_id": "nh27_detour", "points": [[91.74, 26.14], [92.68, 26.35], [92.80, 24.83]]},
        ],
        "day": 2,
        "vehicle_profile": "heavy_multi_axle",
    }
    resp = client.post("/score-routes", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["recommendation"] in ("nh6_direct", "nh27_detour")
    assert len(data["ranking"]) == 2
    assert len(data["routes"]) == 2


def test_integration_dispatch_orchestration():
    """Verify end-to-end dispatching with convoy fleet evaluation."""
    payload = {
        "start": [91.74, 26.14],
        "end": [92.80, 24.83],
        "day": 2,
        "vehicle_profile": "heavy_multi_axle",
        "routes": [
            {"route_id": "route_1", "points": [[91.74, 26.14], [92.80, 24.83]]},
            {"route_id": "route_2", "points": [[91.74, 26.14], [92.10, 25.50], [92.80, 24.83]]},
        ],
    }
    resp = client.post("/dispatch", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["recommendation"] in ("route_1", "route_2")
    assert len(data["routes"]) == 2


def test_integration_weather_subsystem_endpoints():
    """Verify all weather sub-endpoints: corridors, detail, points, and route profile."""
    # 1. Weather corridor overview
    w_corrs = client.get("/weather/corridors")
    assert w_corrs.status_code == 200
    corrs_data = w_corrs.json()
    assert len(corrs_data["corridors"]) == 37

    # 2. Weather corridor detail
    w_detail = client.get("/weather/corridors/31")
    assert w_detail.status_code == 200
    detail_data = w_detail.json()
    assert detail_data["corridor_id"] == 31
    assert len(detail_data["points"]) == 3

    # 3. Weather points catalog
    w_pts = client.get("/weather/points")
    assert w_pts.status_code == 200
    pts_data = w_pts.json()
    assert len(pts_data) == 119

    # 4. Spatiotemporal route weather profile (relative and calendar anchored)
    w_route = client.post(
        "/weather/route",
        json={
            "points": [[91.74, 26.14], [92.00, 25.80], [92.80, 24.83]],
            "operating_speed_kmh": 35.0,
            "max_samples": 20,
            "departure_time": "2026-09-20T08:00:00Z",
        },
    )
    assert w_route.status_code == 200
    route_data = w_route.json()
    assert route_data["total_distance_km"] > 0.0
    assert "weather_summary" in route_data
    assert "min_visibility_m" in route_data["weather_summary"]
    ws = route_data["weather_summary"]
    assert "rain_windows" in ws and "fog_sections" in ws and "high_crosswind_sections" in ws


def test_integration_alerts_and_road_segments():
    """Verify active alerts and dynamically resolved road segments."""
    alerts = client.get("/alerts", params={"floor": "WATCH"})
    assert alerts.status_code == 200
    assert "alerts" in alerts.json()

    segs = client.get("/segments")
    assert segs.status_code == 200
    seg_data = segs.json()
    assert len(seg_data["segments"]) >= 30
    assert all("threshold_q" in s for s in seg_data["segments"])
