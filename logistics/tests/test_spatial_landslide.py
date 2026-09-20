"""Comprehensive tests for spatial landslide evaluation, SACHET CAP parsing, and multi-hazard fusion."""

from __future__ import annotations

import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from fastapi.testclient import TestClient

from app.db.connection import read_cursor, write_connection
from app.db.queries import get_spatial_route_hazards, build_linestring_wkt
from app.api.server import app
from app.modules.landslide.sachet_client import (
    parse_cap_polygon_to_wkt,
    make_buffer_polygon_wkt,
    match_location_polygon,
    parse_cap_xml,
)
from app.modules.landslide.ingest import seed_mountain_corridors
from app.modules.risk.scorer import score_route_geometry
from app.modules.risk.geo import sample_coordinates_adaptive


client = TestClient(app)


def test_parse_cap_polygon_to_wkt():
    """Verify coordinate inversion from lat,lon to lon lat and automated ring closure."""
    # Unclosed quadrangle in Assam [lat, lon]
    raw_coords = "26.10,91.70 26.30,91.70 26.30,91.90 26.10,91.90"
    wkt = parse_cap_polygon_to_wkt(raw_coords)

    assert wkt is not None
    assert wkt.startswith("POLYGON((")
    assert wkt.endswith("))")
    # Coordinates must be lon lat
    assert "91.7 26.1" in wkt
    # First vertex must equal last vertex
    tokens = wkt.replace("POLYGON((", "").replace("))", "").split(", ")
    assert tokens[0] == tokens[-1]


def test_parse_cap_polygon_out_of_bounds():
    """Verify coordinates outside Northeast India are discarded."""
    # Coordinates in Delhi/Rajasthan
    raw_coords = "28.61,77.20 28.70,77.20 28.70,77.30 28.61,77.30"
    wkt = parse_cap_polygon_to_wkt(raw_coords)
    assert wkt is None


def test_match_location_polygon():
    """Verify text mentions of NE towns map to spatial bounding polygons."""
    wkt = match_location_polygon("Severe landslide alert for Lumshnong along NH-6")
    assert wkt is not None
    assert "POLYGON((" in wkt
    assert "92." in wkt and "25." in wkt


def test_parse_cap_xml_sample():
    """Verify parsing full CAP XML message."""
    xml_sample = """<?xml version="1.0" encoding="UTF-8"?>
    <alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
        <identifier>TEST-ALERT-001</identifier>
        <sender>Meghalaya-SDMA</sender>
        <sent>2026-09-19T10:00:00+05:30</sent>
        <status>Actual</status>
        <msgType>Alert</msgType>
        <info>
            <event>Landslide</event>
            <urgency>Immediate</urgency>
            <severity>Severe</severity>
            <certainty>Observed</certainty>
            <headline>Major rockfall and road blockage at Sonapur</headline>
            <area>
                <areaDesc>Sonapur, East Jaintia Hills, Meghalaya</areaDesc>
                <polygon>25.08,92.36 25.10,92.36 25.10,92.38 25.08,92.38</polygon>
            </area>
        </info>
    </alert>
    """
    alerts = parse_cap_xml(xml_sample)
    assert len(alerts) == 1
    alert = alerts[0]
    assert "TEST-ALERT-001" in alert["identifier"]
    assert alert["sender"] == "Meghalaya-SDMA"
    assert alert["event"] == "Landslide"
    assert alert["severity"] == "Severe"
    assert alert["polygon_wkt"].startswith("POLYGON((")


def test_spatial_route_intersection_duckdb():
    """Verify route polyline intersection against mountain corridors and SACHET alerts in DuckDB."""
    seed_mountain_corridors()

    # Route traversing Meghalaya NH-6 corridor (Shillong to Lumshnong)
    route_points = [
        (91.88, 25.57),
        (92.19, 25.45),
        (92.38, 25.18),
    ]

    with read_cursor() as con:
        hazards = get_spatial_route_hazards(con, route_points)

    assert isinstance(hazards, dict)
    assert "intersected_mountain_corridors" in hazards
    assert hazards["total_mountain_km"] > 0.0
    assert hazards["max_landslide_susceptibility"] >= 0.70


def test_spatial_plains_route_no_landslide():
    """Verify route exclusively in Brahmaputra plain has zero mountain kilometers."""
    seed_mountain_corridors()

    # Plains route: Guwahati to Tezpur along the river
    plains_points = [
        (91.68, 26.18),
        (92.00, 26.35),
        (92.73, 26.62),
    ]

    with read_cursor() as con:
        hazards = get_spatial_route_hazards(con, plains_points)

    assert hazards["total_mountain_km"] == 0.0
    assert hazards["max_landslide_susceptibility"] == 0.0


def test_multi_hazard_fusion_math():
    """Verify joint closure likelihood adheres to independent multi-hazard probability theory."""
    # Test case 1: Zero hazards
    res_zero = score_route_geometry(
        points=[[91.68, 26.18], [91.70, 26.19]],
        spatial_hazards={
            "active_sachet_alerts": [],
            "total_blocked_km": 0.0,
            "has_active_roadblock": False,
            "intersected_mountain_corridors": [],
            "total_mountain_km": 0.0,
            "max_landslide_susceptibility": 0.0,
        },
    )
    assert res_zero["closure_likelihood"] == 0.01, f"Expected ambient base 0.01, got {res_zero['closure_likelihood']}"
    assert res_zero["p_flood"] == 0.0
    assert res_zero["p_landslide"] == 0.0, "Landslide over plains must be strictly zero"
    assert res_zero["p_roadblock"] == 0.0
    assert res_zero["primary_hazard"] == "none"

    # Test case 2: Roadblock forces closure_likelihood = 1.0 and HOLD verdict
    res_roadblock = score_route_geometry(
        points=[[91.68, 26.18], [91.70, 26.19]],
        spatial_hazards={
            "active_sachet_alerts": [{
                "identifier": "TEST-RB",
                "sender": "Traffic Police",
                "event": "Roadblock",
                "severity": "Severe",
                "headline": "Highway closed due to landslide debris",
                "area_desc": "Sonapur Tunnel",
                "blocked_km": 5.2,
            }],
            "total_blocked_km": 5.2,
            "has_active_roadblock": True,
            "intersected_mountain_corridors": [],
            "total_mountain_km": 0.0,
            "max_landslide_susceptibility": 0.0,
        },
    )
    assert res_roadblock["closure_likelihood"] == 1.0
    assert res_roadblock["p_roadblock"] == 1.0
    assert res_roadblock["is_passable"] is False
    assert res_roadblock["verdict"] == "HOLD"
    assert res_roadblock["primary_hazard"] == "official_roadblock"
    assert any("SACHET Alert Zone" in w["segment"] for w in res_roadblock["warnings"])


def test_route_scoring_latency():
    """Benchmark: Spatial route evaluation must complete well within sub-25ms latency budget."""
    # Construct 100-point synthetic route across Assam and Meghalaya
    points = [
        [round(91.50 + i * 0.02, 4), round(25.50 + (i % 5) * 0.01, 4)]
        for i in range(100)
    ]

    with read_cursor() as con:
        # Pre-warm query plan
        pt_tuples = [(p[0], p[1]) for p in points]
        get_spatial_route_hazards(con, pt_tuples)

        # Timed execution
        t0 = time.perf_counter()
        hazards = get_spatial_route_hazards(con, pt_tuples)
        t_elapsed_ms = (time.perf_counter() - t0) * 1000.0

    print(f"Spatial hazard lookup latency: {t_elapsed_ms:.2f} ms")
    assert t_elapsed_ms < 25.0, f"Expected < 25ms, took {t_elapsed_ms:.2f} ms"


def test_api_route_risk_returns_spatial_hazards():
    """Verify /route-risk returns multi-hazard closure likelihood and spatial hazard keys."""
    db_path = str(Path(__file__).resolve().parent.parent / "data" / "ne_india.duckdb")
    resp = client.post(
        "/route-risk",
        params={"db": db_path},
        json={
            "points": [[91.68, 26.17], [92.73, 26.62]],
            "day": 2,
            "vehicle_profile": "heavy_truck",
            "max_samples": 20,
        },
    )
    assert resp.status_code == 200, f"Failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert "closure_likelihood" in data
    assert "p_flood" in data
    assert "p_landslide" in data
    assert "p_roadblock" in data
    assert "primary_hazard" in data
    assert "spatial_hazards" in data
    assert "active_sachet_alerts" in data["spatial_hazards"]


def test_adaptive_sampling_structure_preservation():
    """Verify that structure-aware sampling preserves critical bridge/culvert coordinates."""
    # Polyline of 100 points
    points = [[round(91.50 + i * 0.01, 4), round(26.00 + i * 0.005, 4)] for i in range(100)]
    # Target bridge located at index 47
    target_bridge = {
        "name": "Anchor Bridge",
        "river": "Dhansiri",
        "lon": points[47][0],
        "lat": points[47][1],
    }

    sampled = sample_coordinates_adaptive(
        points=points,
        max_samples=20,
        structures=[target_bridge],
        snap_radius_km=2.5,
    )

    # Bridge coordinate must be strictly preserved
    sampled_set = set(sampled)
    assert (points[47][0], points[47][1]) in sampled_set, "Target bridge must be an anchor"
    assert (points[0][0], points[0][1]) in sampled_set, "Start point must be an anchor"
    assert (points[-1][0], points[-1][1]) in sampled_set, "Terminal point must be an anchor"
    assert len(sampled) <= 35, f"Sample size must be controlled, got {len(sampled)}"


def test_hydrological_proximity_cutoff_enforcement():
    """Verify river reach cutoff: distant gauges on the same river are not falsely snapped."""
    # Point at bridge
    points = [[93.60, 25.12], [93.61, 25.13]]
    bridge = [{
        "name": "Doyang River Crossing",
        "river": "Doyang",
        "lon": 93.60,
        "lat": 25.12,
    }]

    # Case A: Gauge on same river but 45 km away (outside 15 km reach cutoff)
    distant_gauge = [{
        "gauge": "Distant_Doyang_gauge",
        "river": "Doyang",
        "cell_lon": 93.95,
        "cell_lat": 25.35,
        "q_mean": 5000.0,
        "q_p50": 4800.0,
        "q_p90": 5200.0,
        "rp5": 3000.0,
        "load_ratio": 1.66,
        "p_rp2": 0.99,
        "p_rp5": 0.95,
        "trend": "RISING",
        "risk": "HIGH",
    }]

    scored_distant = score_route_geometry(
        points=points,
        day=2,
        gauges=distant_gauge,
        crossings=bridge,
    )
    leg_distant = scored_distant["legs"][0]
    assert leg_distant["gauge"] != "Distant_Doyang_gauge", "Distant gauge (> 15 km) must be ignored"
    assert leg_distant["risk"] == "OK", "Must be treated as ungauged clear terrain"

    # Case B: Gauge on same river within 5 km reach
    near_gauge = [{
        "gauge": "Near_Doyang_gauge",
        "river": "Doyang",
        "cell_lon": 93.62,
        "cell_lat": 25.13,
        "q_mean": 5000.0,
        "q_p50": 4800.0,
        "q_p90": 5200.0,
        "rp5": 3000.0,
        "load_ratio": 1.66,
        "p_rp2": 0.99,
        "p_rp5": 0.95,
        "trend": "RISING",
        "risk": "HIGH",
    }]

    scored_near = score_route_geometry(
        points=points,
        day=2,
        gauges=near_gauge,
        crossings=bridge,
    )
    leg_near = scored_near["legs"][0]
    assert leg_near["gauge"] == "Near_Doyang_gauge", "Nearby gauge (<= 15 km) must be snapped"
    assert leg_near["risk"] == "HIGH", "High risk must be propagated from nearby gauge"


def test_dynamic_landslide_trigger_seismic_floor():
    """Verify background seismic floor (P_base = 0.02) and dynamic rain/alert scaling."""
    points = [[91.88, 25.57], [92.19, 25.45]]

    # Case 1: High susceptibility mountain corridor, dry weather (no rain proxy)
    res_dry = score_route_geometry(
        points=points,
        weather_grid=[],
        spatial_hazards={
            "active_sachet_alerts": [],
            "total_blocked_km": 0.0,
            "has_active_roadblock": False,
            "intersected_mountain_corridors": [{"name": "Meghalaya Ghat"}],
            "total_mountain_km": 25.0,
            "max_landslide_susceptibility": 0.85,
        },
    )
    # P_landslide = round(0.85 * 0.02, 3) = 0.017
    assert res_dry["p_landslide"] == 0.017, f"Expected 0.017 seismic floor, got {res_dry['p_landslide']}"
    assert res_dry["p_landslide"] > 0.0, "Dry weather in Zone V must retain non-zero seismic floor"

    # Case 2: High susceptibility mountain corridor with flood/rain proxy
    gauges_rain = [{
        "gauge": "Test_gauge",
        "river": "TestRiver",
        "cell_lon": 91.88,
        "cell_lat": 25.57,
        "q_mean": 2000.0,
        "q_p50": 1900.0,
        "q_p90": 2100.0,
        "rp5": 2000.0,
        "load_ratio": 1.0,
        "p_rp2": 0.99,
        "p_rp5": 0.80,
        "trend": "RISING",
        "risk": "HIGH",
    }]
    res_wet = score_route_geometry(
        points=points,
        gauges=gauges_rain,
        weather_grid=[],
        spatial_hazards={
            "active_sachet_alerts": [],
            "total_blocked_km": 0.0,
            "has_active_roadblock": False,
            "intersected_mountain_corridors": [{"name": "Meghalaya Ghat"}],
            "total_mountain_km": 25.0,
            "max_landslide_susceptibility": 0.85,
        },
    )
    # P_landslide = round(0.85 * (0.02 + 0.80), 3) = round(0.85 * 0.82, 3) = 0.697
    assert res_wet["p_landslide"] == 0.697, f"Expected 0.697, got {res_wet['p_landslide']}"

    # Case 3: Active SACHET landslide alert forces trigger = 1.0
    res_alert = score_route_geometry(
        points=points,
        spatial_hazards={
            "active_sachet_alerts": [{
                "event": "Landslide Warning",
                "severity": "Severe",
                "headline": "Massive slope failure on NH-6",
                "blocked_km": 2.0,
            }],
            "total_blocked_km": 2.0,
            "has_active_roadblock": True,
            "intersected_mountain_corridors": [{"name": "Meghalaya Ghat"}],
            "total_mountain_km": 25.0,
            "max_landslide_susceptibility": 0.85,
        },
    )
    # P_landslide = round(0.85 * 1.0, 3) = 0.85
    assert res_alert["p_landslide"] == 0.850, f"Expected 0.850, got {res_alert['p_landslide']}"


def test_lhasa_per_point_overrides_legacy():
    """Verify that passing landslide_eval with LHASA data overrides the legacy corridor heuristic."""
    points = [[91.88, 25.57], [92.19, 25.45]]

    # LHASA per-point evaluation says P=0.35 route-level
    res_lhasa = score_route_geometry(
        points=points,
        spatial_hazards={
            "active_sachet_alerts": [],
            "total_blocked_km": 0.0,
            "has_active_roadblock": False,
            "intersected_mountain_corridors": [{"name": "Meghalaya Ghat"}],
            "total_mountain_km": 25.0,
            "max_landslide_susceptibility": 0.85,
        },
        landslide_eval={
            "p_landslide": 0.35,
            "segments": [
                {"km_start": 0.0, "km_end": 25.0, "p_segment": 0.35, "n_points": 2},
            ],
            "status": "ok",
            "n_lhasa_hits": 2,
            "n_alert_hits": 0,
        },
    )
    # Should use LHASA value, NOT legacy 0.85 * (0.02 + p_rp5)
    assert res_lhasa["p_landslide"] == 0.35, f"Expected 0.35 from LHASA, got {res_lhasa['p_landslide']}"
    assert res_lhasa["landslide_status"] == "ok"
    assert len(res_lhasa["landslide_segments"]) == 1


def test_lhasa_evaluator_compute_point_probability():
    """Verify per-point probability computation from the evaluator module."""
    from app.modules.landslide.evaluator import _compute_point_probability

    # Case 1: LHASA hazard present
    r1 = _compute_point_probability(
        lhasa_hazard=0.42,
        lhasa_susceptibility=0.70,
        rainfall_24h_mm=45.0,
        alert_hit=None,
    )
    assert r1["p"] == 0.42
    assert r1["source"] == "lhasa_hazard"

    # Case 2: No LHASA, but susceptibility + heavy rain
    # LHASA susceptibility is 0-5 scale; 4.0 normalizes to 0.8
    r2 = _compute_point_probability(
        lhasa_hazard=None,
        lhasa_susceptibility=4.0,
        rainfall_24h_mm=75.0,
        alert_hit=None,
    )
    # 4.0 / 5.0 = 0.8 normalized, 0.8 * 0.7 (high rainfall) = 0.56
    assert r2["p"] == 0.56
    assert r2["source"] == "susceptibility_rainfall"

    # Case 3: Active SACHET alert overrides everything
    r3 = _compute_point_probability(
        lhasa_hazard=0.10,
        lhasa_susceptibility=0.30,
        rainfall_24h_mm=5.0,
        alert_hit={"severity": "Extreme", "event": "Landslide"},
    )
    assert r3["p"] == 1.0
    assert r3["source"] == "sachet_alert"

    # Case 4: No data at all -> seismic floor
    r4 = _compute_point_probability(
        lhasa_hazard=None,
        lhasa_susceptibility=None,
        rainfall_24h_mm=0.0,
        alert_hit=None,
    )
    assert r4["p"] == 0.02
    assert r4["source"] == "seismic_floor"


def test_lhasa_evaluator_segment_aggregation():
    """Verify Extreme Value Theory (block-maximum) segment aggregation."""
    from app.modules.landslide.evaluator import _aggregate_segments

    points = [
        {"km": 0.0, "p": 0.01},
        {"km": 2.5, "p": 0.02},
        {"km": 5.0, "p": 0.50},
        {"km": 7.5, "p": 0.03},
        {"km": 10.0, "p": 0.01},
    ]

    segments, p_route = _aggregate_segments(points, segment_length_km=5.0)

    # 2 clean 5 km segments without dummy zero-length trailing segment
    assert len(segments) == 2
    assert segments[0]["km_start"] == 0.0
    assert segments[0]["km_end"] == 5.0
    assert segments[1]["km_start"] == 5.0
    assert segments[1]["km_end"] == 10.0

    # Extreme value block maximum:
    # Segment 1: max(0.01, 0.02) = 0.02
    assert segments[0]["p_segment"] == 0.02
    # Segment 2: max(0.50, 0.03, 0.01) = 0.50
    assert segments[1]["p_segment"] == 0.50
    # Route: 1 - (1-0.02)*(1-0.50) = 1 - 0.49 = 0.51
    assert abs(p_route - 0.51) < 0.001


def test_lhasa_evaluator_plains_zero_landslide():
    """Verify that flat plains with zero susceptibility return zero landslide probability."""
    from app.modules.landslide.evaluator import _compute_point_probability, _aggregate_segments

    # Flat plain coordinate with zero susceptibility
    r_plain = _compute_point_probability(
        lhasa_hazard=None,
        lhasa_susceptibility=0.0,
        rainfall_24h_mm=100.0,
        alert_hit=None,
        is_mountain=False,
    )
    assert r_plain["p"] == 0.0
    assert r_plain["source"] == "plains_zero"

    # Aggregating 100 plains points yields exactly 0.0 route landslide probability
    plains_points = [{"km": i * 2.0, "p": 0.0} for i in range(100)]
    segments, p_route = _aggregate_segments(plains_points, segment_length_km=5.0)
    assert p_route == 0.0
    assert all(s["p_segment"] == 0.0 for s in segments)


