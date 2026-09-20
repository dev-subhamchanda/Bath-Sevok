"""Hypothesis property-based tests for logistics manifest boundaries, staging zones, and AI features."""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from hypothesis import given, strategies as st
from app.modules.risk.scorer import score_route_geometry
from app.modules.logistics_ai.features import extract_route_features
from app.enums import Verdict


@given(
    n_points=st.integers(min_value=2, max_value=25),
    spacing=st.floats(min_value=0.01, max_value=0.15),
    blocker_idx=st.integers(min_value=0, max_value=24),
)
def test_prop_staging_boundary_constraints(n_points: int, spacing: float, blocker_idx: int):
    """Property: For any route of length D, 0.0 <= safe_staging_km <= first_blocker.km <= D."""
    points = [[91.70 + i * spacing, 26.15 + i * (spacing * 0.1)] for i in range(n_points)]
    actual_blocker_idx = min(blocker_idx, n_points - 1)

    blocker_coord = points[actual_blocker_idx]
    crossings = [{
        "name": f"Chokepoint_{actual_blocker_idx}",
        "river": "Brahmaputra",
        "lon": blocker_coord[0],
        "lat": blocker_coord[1],
    }]

    # Flood at this specific crossing
    gauges = [{
        "gauge": "Test_Gauge",
        "river": "Brahmaputra",
        "cell_lon": blocker_coord[0],
        "cell_lat": blocker_coord[1],
        "q_mean": 60000.0,
        "q_p50": 59000.0,
        "q_p90": 62000.0,
        "rp2": 40000.0,
        "rp5": 50000.0,
        "load_ratio": 1.20,
        "p_rp2": 0.99,
        "p_rp5": 0.85,
        "p_rp10": 0.30,
        "trend": "RISING",
        "risk": "HIGH",
    }]

    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        max_samples=n_points,
        vehicle_profile="heavy_truck",
    )

    d_total = scored["total_distance_km"]
    safe_km = scored["safe_staging_km"]
    first_blocker = scored["first_blocker"]

    assert scored["verdict"] == Verdict.HOLD.value
    assert first_blocker is not None, "First blocker must be identified"
    blocker_km = first_blocker["km"]

    # Fundamental Invariant: 0.0 <= safe_staging_km <= blocker_km <= total_distance_km
    assert 0.0 <= safe_km, f"Safe staging km cannot be negative: {safe_km}"
    assert safe_km <= blocker_km + 1e-3, f"Safe staging ({safe_km}) cannot exceed blocker km ({blocker_km})"
    assert blocker_km <= d_total + 1e-3, f"Blocker km ({blocker_km}) cannot exceed total km ({d_total})"

    # Origin Failure Edge Case:
    # If the origin itself (index 0) is flooded, safe_staging_km must be 0.0
    if actual_blocker_idx == 0:
        assert safe_km == 0.0, f"Flooded origin must have safe_staging_km == 0.0, got {safe_km}"
        assert blocker_km == 0.0, f"Flooded origin must have blocker_km == 0.0, got {blocker_km}"


@given(
    n_points=st.integers(min_value=3, max_value=20),
    spacing=st.floats(min_value=0.01, max_value=0.10),
)
def test_prop_clear_route_staging_equality(n_points: int, spacing: float):
    """Property: For a completely passable route, first_blocker is None and safe_staging_km == total_km."""
    points = [[91.70 + i * spacing, 26.15 + i * (spacing * 0.1)] for i in range(n_points)]

    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=[],
        crossings=[],
        max_samples=n_points,
        vehicle_profile="heavy_truck",
    )

    assert scored["is_passable"] is True
    assert scored["first_blocker"] is None, "Passable route must have no blocker"
    assert scored["safe_staging_km"] == scored["total_distance_km"], (
        f"Safe staging ({scored['safe_staging_km']}) must equal total distance ({scored['total_distance_km']})"
    )


@given(
    n_legs=st.integers(min_value=1, max_value=30),
    watch_ratio=st.floats(min_value=0.0, max_value=1.0),
    hold_ratio=st.floats(min_value=0.0, max_value=1.0),
)
def test_prop_logistics_ai_feature_bounds(n_legs: int, watch_ratio: float, hold_ratio: float):
    """Property: All fractions and probabilities in the /features vector are strictly bounded in [0.0, 1.0]."""
    legs = []
    for i in range(n_legs):
        risk = "HIGH" if (i / n_legs) < hold_ratio else ("WATCH" if (i / n_legs) < watch_ratio else "OK")
        legs.append({
            "lon": 92.0 + i * 0.05,
            "lat": 26.0 + i * 0.02,
            "km_from_start": i * 10.0,
            "gauge": f"G_{i}",
            "river": "Brahmaputra",
            "gauge_km": 5.0,
            "crossing": None,
            "q_mean": 1000.0,
            "q_p50": 950.0,
            "q_p90": 1050.0,
            "rp2": 800.0,
            "rp5": 1200.0,
            "load_ratio": 0.83,
            "p_rp2": 0.5,
            "p_rp5": 0.2,
            "p_rp10": 0.0,
            "trend": "STABLE",
            "risk": risk,
            "segment": None,
            "segment_threshold_q": None,
        })

    scored = {
        "legs": legs,
        "verdict": "HOLD" if any(l["risk"] == "HIGH" for l in legs) else ("CAUTION" if any(l["risk"] == "WATCH" for l in legs) else "GO"),
    }

    features = extract_route_features(scored)

    # Invariant checks on numerical bounds
    assert 0.0 <= features["frac_watch"] <= 1.0
    assert 0.0 <= features["frac_hold"] <= 1.0
    assert 0.0 <= features["max_p_rp5"] <= 1.0
    assert 0.0 <= features["mean_p_rp5"] <= 1.0
    assert features["max_load_ratio"] >= 0.0
    assert features["max_spread"] >= 0.0
    assert 0.0 <= features["frac_rising"] <= 1.0
    assert features["physics_floor"] == features["physics_verdict"]


@given(
    n_points=st.integers(min_value=5, max_value=25),
    spacing=st.floats(min_value=0.02, max_value=0.15),
    blocker_idx=st.integers(min_value=1, max_value=24),
)
def test_prop_staging_node_upstream_constraint(n_points: int, spacing: float, blocker_idx: int):
    """Property: When a safe staging town node is identified, it is strictly upstream of the first blocker: s_node <= s_blocker."""
    points = [[91.70 + i * spacing, 26.15 + i * (spacing * 0.1)] for i in range(n_points)]
    actual_blocker_idx = min(blocker_idx, n_points - 1)

    blocker_coord = points[actual_blocker_idx]
    crossings = [{
        "name": f"Chokepoint_{actual_blocker_idx}",
        "river": "Brahmaputra",
        "lon": blocker_coord[0],
        "lat": blocker_coord[1],
    }]

    corridor_points = [
        {"corridor_id": 1, "point_name": f"Depot_{i}", "river": "Brahmaputra", "lon": points[i][0], "lat": points[i][1], "role": "chokepoint"}
        for i in range(n_points)
    ]

    gauges = [{
        "gauge": "Test_Gauge",
        "river": "Brahmaputra",
        "cell_lon": blocker_coord[0],
        "cell_lat": blocker_coord[1],
        "q_mean": 60000.0,
        "q_p50": 59000.0,
        "q_p90": 62000.0,
        "rp2": 40000.0,
        "rp5": 50000.0,
        "load_ratio": 1.20,
        "p_rp2": 0.99,
        "p_rp5": 0.85,
        "p_rp10": 0.30,
        "trend": "RISING",
        "risk": "HIGH",
    }]

    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        max_samples=n_points,
        corridor_points=corridor_points,
        vehicle_profile="heavy_truck",
    )

    first_blocker = scored["first_blocker"]
    safe_node = scored["safe_staging_node"]

    assert first_blocker is not None
    blocker_km = first_blocker["km"]

    if safe_node is not None:
        assert safe_node["km"] <= blocker_km + 1e-3, (
            f"Staging node ({safe_node['name']} at {safe_node['km']}km) must be <= blocker km ({blocker_km}km)"
        )

