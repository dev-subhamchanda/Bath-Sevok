"""Unit and API contract tests for the Weather Subsystem."""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.api.server import app
from app.modules.weather.metrics import (
    classify_visibility,
    classify_rain_rate,
    classify_weather_code,
    classify_rain_risk,
    calculate_accumulation,
    evaluate_weather,
)
from app.modules.risk.scorer import score_route_geometry
from app.db.connection import read_cursor
from app.db.queries import get_crossings, get_linear_hazards, get_spatial_route_hazards


client = TestClient(app)


def test_classify_visibility():
    """Verify horizontal sight distance classification under IRC standards."""
    assert classify_visibility(1500.0) == "CLEAR"
    assert classify_visibility(1000.0) == "CLEAR"
    assert classify_visibility(750.0) == "IMPAIRED"
    assert classify_visibility(500.0) == "IMPAIRED"
    assert classify_visibility(300.0) == "POOR_FOG"
    assert classify_visibility(150.0) == "POOR_FOG"
    assert classify_visibility(149.0) == "DENSE_FOG_HAZARD"
    assert classify_visibility(50.0) == "DENSE_FOG_HAZARD"


def test_classify_rain_rate():
    """Verify hourly precipitation intensity classification."""
    assert classify_rain_rate(0.0) == "DRY"
    assert classify_rain_rate(0.04) == "DRY"
    assert classify_rain_rate(1.5) == "LIGHT"
    assert classify_rain_rate(2.5) == "LIGHT"
    assert classify_rain_rate(5.0) == "MODERATE"
    assert classify_rain_rate(7.5) == "MODERATE"
    assert classify_rain_rate(20.0) == "HEAVY"
    assert classify_rain_rate(35.0) == "HEAVY"
    assert classify_rain_rate(35.1) == "TORRENTIAL_CLOUDBURST"
    assert classify_rain_rate(60.0) == "TORRENTIAL_CLOUDBURST"


def test_classify_weather_code():
    """Verify WMO weather code descriptive mapping."""
    assert classify_weather_code(0) == "clear_sky"
    assert classify_weather_code(2) == "partly_cloudy"
    assert classify_weather_code(45) == "fog_mist"
    assert classify_weather_code(51) == "drizzle"
    assert classify_weather_code(61) == "rain"
    assert classify_weather_code(80) == "rain_showers"
    assert classify_weather_code(95) == "thunderstorm"


def test_calculate_accumulation():
    """Verify timestamp-aligned accumulation calculation with None handling."""
    ref_dt = "2026-09-20T12:00:00Z"
    times = [f"2026-09-{17 + h // 24:02d}T{h % 24:02d}:00" for h in range(168)]
    precip = [1.0 if h % 2 == 0 else None for h in range(168)]

    r24, r3d, r7d = calculate_accumulation(times, precip, ref_dt)
    assert r24 >= 0.0
    assert r3d >= r24
    assert r7d >= 0.0


def test_evaluate_route_weather_profile():
    """Verify spatiotemporal arrival matching and route profile synthesis."""
    now_utc = datetime.now(timezone.utc)
    hourly_times = [(now_utc + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(48)]
    hourly_precip = [0.0] * 10 + [12.0] * 10 + [0.0] * 28  # Heavy rain between T+10 and T+20
    hourly_vis = [10000.0] * 12 + [350.0] * 6 + [10000.0] * 30  # Fog between T+12 and T+18
    hourly_gusts = [15.0] * 20 + [65.0] * 5 + [15.0] * 23  # Crosswinds at T+20 to T+25

    mock_grid = [
        {
            "point_name": "Test Mountain Pass",
            "lon": 92.0,
            "lat": 26.0,
            "hourly_time": json.dumps(hourly_times),
            "hourly_precipitation": json.dumps(hourly_precip),
            "hourly_visibility": json.dumps(hourly_vis),
            "hourly_weather_code": json.dumps([63] * 48),
            "hourly_wind_gust": json.dumps(hourly_gusts),
            "rain_24h": 65.0,
            "rain_3d": 90.0,
            "current_rain_mm_h": 0.0,
            "current_visibility_m": 10000.0,
            "current_wind_gust_kmh": 15.0,
        }
    ]

    legs = [
        {"lon": 91.9, "lat": 25.9, "km_from_start": 0.0, "t_min_hours": 0.0, "t_max_hours": 1.0, "elapsed_hours": 0.5},
        {"lon": 92.0, "lat": 26.0, "km_from_start": 150.0, "t_min_hours": 12.0, "t_max_hours": 15.0, "elapsed_hours": 13.5},
        {"lon": 92.1, "lat": 26.1, "km_from_start": 250.0, "t_min_hours": 21.0, "t_max_hours": 23.0, "elapsed_hours": 22.0},
    ]

    profile = evaluate_weather(legs, mock_grid, now_utc)

    assert profile["has_active_rain"] is True
    assert profile["max_rain_rate_mm_h"] == 12.0
    assert profile["min_visibility_m"] == 350.0
    assert profile["visibility_verdict"] == "CAUTION_FOG"
    assert profile["max_wind_gust_kmh"] == 65.0
    assert len(profile["rain_windows"]) >= 1
    assert len(profile["fog_sections"]) >= 1
    assert len(profile["high_crosswind_sections"]) >= 1

    # Verify structured arrival bounds and ISO timestamps across hazard types
    rw = profile["rain_windows"][0]
    assert rw["arrival_start_hours"] >= 0.0
    assert rw["arrival_end_hours"] >= rw["arrival_start_hours"]
    assert rw["arrival_start_time"] is not None
    assert rw["arrival_end_time"] is not None
    assert "T+" in rw["arrival_window"]

    fog = profile["fog_sections"][0]
    assert fog["arrival_start_hours"] >= 0.0
    assert fog["arrival_end_hours"] >= fog["arrival_start_hours"]
    assert fog["arrival_start_time"] is not None
    assert fog["arrival_end_time"] is not None
    assert fog["length_km"] >= 0.0
    assert "T+" in fog["arrival_window"]

    wind = profile["high_crosswind_sections"][0]
    assert wind["arrival_start_hours"] >= 0.0
    assert wind["arrival_end_hours"] >= wind["arrival_start_hours"]
    assert wind["arrival_start_time"] is not None
    assert wind["arrival_end_time"] is not None
    assert "T+" in wind["arrival_window"]

    # Verify relative dispatch behavior when departure_time is omitted
    rel_profile = evaluate_weather(legs, mock_grid, departure_time=None)
    rw_rel = rel_profile["rain_windows"][0]
    assert rw_rel["arrival_start_hours"] == rw["arrival_start_hours"]
    assert rw_rel["arrival_end_hours"] == rw["arrival_end_hours"]
    assert rw_rel["arrival_start_time"] is None
    assert rw_rel["arrival_end_time"] is None


def test_scorer_weather_coupling_and_pluvial_cloudburst():
    """Verify rainfall-triggered landslide scaling and pluvial causeway inundation."""
    points = [[round(92.0 + i * 0.01, 4), round(26.0 + i * 0.01, 4)] for i in range(20)]
    now_utc = datetime.now(timezone.utc)
    hourly_times = [(now_utc + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00") for i in range(24)]

    # 1. Test torrential downpour (>= 35 mm/h) over a 0.0m causeway
    mock_crossings = [
        {
            "structure_id": 999,
            "name": "Submerged Low Causeway",
            "river": "Hill Stream",
            "lon": points[5][0],
            "lat": points[5][1],
            "clearance_m": 0.0,
            "clearance_class": "causeway",
            "notes": "Low causeway",
            "status": "monitored",
        }
    ]

    mock_weather = [
        {
            "point_name": "Cloudburst Cell",
            "lon": points[5][0],
            "lat": points[5][1],
            "hourly_time": json.dumps(hourly_times),
            "hourly_precipitation": json.dumps([40.0] * 24),  # 40 mm/h torrential rain
            "hourly_visibility": json.dumps([200.0] * 24),
            "hourly_weather_code": json.dumps([95] * 24),
            "hourly_wind_gust": json.dumps([30.0] * 24),
            "rain_24h": 120.0,
            "rain_3d": 160.0,
            "current_rain_mm_h": 40.0,
            "current_visibility_m": 200.0,
            "current_wind_gust_kmh": 30.0,
        }
    ]

    mock_spatial = {
        "active_sachet_alerts": [],
        "total_blocked_km": 0.0,
        "has_active_roadblock": False,
        "intersected_mountain_corridors": [{"corridor_id": 31, "baseline_susceptibility": 0.75, "mountain_km": 20.0}],
        "total_mountain_km": 20.0,
        "max_landslide_susceptibility": 0.75,
    }

    res = score_route_geometry(
        points=points,
        day=0,
        crossings=mock_crossings,
        spatial_hazards=mock_spatial,
        weather_grid=mock_weather,
        terrain_class="mountain_ghat",
    )

    # Landslide trigger must be elevated by rain_24h >= 100mm
    assert res["p_landslide"] >= 0.70
    # Pluvial cloudburst must cause causeway HOLD
    assert res["verdict"] == "HOLD"
    assert res["first_blocker"] is not None
    assert "cloudburst" in res["first_blocker"]["reason"].lower()
    assert res["weather_summary"]["has_active_rain"] is True
    assert res["weather_summary"]["min_visibility_m"] == 200.0


def test_api_weather_corridors():
    """Validate GET /weather/corridors endpoint."""
    r = client.get("/weather/corridors")
    assert r.status_code == 200
    data = r.json()
    assert "corridors" in data
    assert len(data["corridors"]) == 37
    c1 = data["corridors"][0]
    assert c1["corridor_id"] == 1
    assert "corridor_name" in c1
    assert "weather_risk" in c1


def test_api_weather_corridor_detail():
    """Validate GET /weather/corridors/{id} endpoint."""
    r = client.get("/weather/corridors/31")
    assert r.status_code == 200
    data = r.json()
    assert data["corridor_id"] == 31
    assert "points" in data
    assert len(data["points"]) >= 1
    p0 = data["points"][0]
    assert "rain_24h" in p0
    assert "current_visibility_m" in p0


def test_api_weather_points():
    """Validate GET /weather/points endpoint."""
    r = client.get("/weather/points?corridor_id=31")
    assert r.status_code == 200
    points = r.json()
    assert isinstance(points, list)
    assert len(points) >= 1
    assert all(p["corridor_id"] == 31 for p in points)


def test_api_weather_route():
    """Validate POST /weather/route endpoint."""
    req_body = {
        "points": [
            [91.73, 26.14],
            [91.90, 25.80],
            [92.20, 25.40],
            [92.80, 24.82],
        ],
        "departure_time": "2026-09-20T06:00:00Z",
        "max_samples": 10,
        "operating_speed_kmh": 35.0,
    }
    r = client.post("/weather/route", json=req_body)
    assert r.status_code == 200
    data = r.json()
    assert "total_distance_km" in data
    assert "weather_summary" in data
    assert "legs" in data
    assert len(data["legs"]) >= 2
    assert "visibility_verdict" in data["weather_summary"]


def test_api_dispatch_includes_weather():
    """Validate that POST /dispatch and POST /route-risk include weather_summary."""
    route_pts = [
        [91.73, 26.14],
        [91.90, 25.80],
        [92.20, 25.40],
        [92.80, 24.82],
    ]
    r = client.post("/route-risk", json={"points": route_pts, "day": 2})
    assert r.status_code == 200
    data = r.json()
    assert "weather_summary" in data
    assert "has_active_rain" in data["weather_summary"]
    assert "min_visibility_m" in data["weather_summary"]
