"""Hypothesis property-based tests for 4D spatiotemporal causal trajectories across multi-day flood waves."""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from hypothesis import given, strategies as st
from app.modules.risk.scorer import score_route_geometry
from app.enums import Verdict


@given(
    n_points=st.integers(min_value=5, max_value=40),
    spacing_deg=st.floats(min_value=0.05, max_value=0.20),
)
def test_prop_arrival_time_monotonicity(n_points: int, spacing_deg: float):
    """Property: Arrival day t(s) at distance s along the route polyline is strictly non-decreasing."""
    # Synthetic route eastward across Assam valley (Guwahati to Tinsukia)
    points = [[91.70 + i * spacing_deg, 26.15 + i * (spacing_deg * 0.2)] for i in range(n_points)]

    dummy_gauges = {d: [] for d in range(7)}

    scored = score_route_geometry(
        points=points,
        day=0,
        departure_day=0,
        gauges=[],
        crossings=[],
        gauges_by_day=dummy_gauges,
        max_samples=n_points,
    )

    legs = scored["legs"]
    assert len(legs) >= 2, "Must have sampled legs"

    for i in range(1, len(legs)):
        prev_day = legs[i - 1]["eval_day"]
        curr_day = legs[i]["eval_day"]
        prev_km = legs[i - 1]["km_from_start"]
        curr_km = legs[i]["km_from_start"]

        assert curr_km >= prev_km, f"Distance must be non-decreasing: km[{i}]={curr_km} < km[{i-1}]={prev_km}"
        assert curr_day >= prev_day, (
            f"4D space-time causality: arrival day must be non-decreasing along route. "
            f"Day[{i}]={curr_day} < Day[{i-1}]={prev_day}"
        )
        assert legs[i]["eval_day_min"] >= legs[i - 1]["eval_day_min"]
        assert legs[i]["eval_day_max"] >= legs[i - 1]["eval_day_max"]
        assert legs[i]["t_min_hours"] <= legs[i]["t_max_hours"]


@given(
    step_km=st.floats(min_value=40.0, max_value=80.0),
)
def test_prop_temporal_recession_clearance(step_km: float):
    """Property: A flood that occurred on Day 0 does not block a truck that arrives on Day 1+ when clear."""
    # Long distance freight corridor (e.g. from Delhi / UP through Bihar and Assam to Silchar ~ 1500 km)
    points = []
    for i in range(25):
        points.append([78.0 + i * (14.0 / 25.0), 26.50 - i * 0.05])
    points.append([92.82, 24.83])  # Mahasadhu Bridge, Silchar

    gauges_by_day = {
        0: [{
            "gauge": "Silchar_gauge",
            "river": "Barak",
            "cell_lon": 92.825,
            "cell_lat": 24.825,
            "q_mean": 2800.0,
            "q_p50": 2750.0,
            "q_p90": 2900.0,
            "rp2": 1800.0,
            "rp5": 2000.0,
            "load_ratio": 1.40,
            "p_rp2": 0.99,
            "p_rp5": 0.90,
            "p_rp10": 0.50,
            "trend": "FALLING",
            "risk": "HIGH",
        }],
        1: [{
            "gauge": "Silchar_gauge",
            "river": "Barak",
            "cell_lon": 92.825,
            "cell_lat": 24.825,
            "q_mean": 1500.0,
            "q_p50": 1450.0,
            "q_p90": 1550.0,
            "rp2": 1800.0,
            "rp5": 2000.0,
            "load_ratio": 0.75,
            "p_rp2": 0.10,
            "p_rp5": 0.0,
            "p_rp10": 0.0,
            "trend": "FALLING",
            "risk": "OK",
        }],
    }
    for d in range(2, 7):
        gauges_by_day[d] = gauges_by_day[1]

    crossings = [{
        "name": "Mahasadhu Bridge",
        "river": "Barak",
        "lon": 92.82,
        "lat": 24.83,
    }]

    scored = score_route_geometry(
        points=points,
        day=0,
        departure_day=0,
        gauges=gauges_by_day[0],
        crossings=crossings,
        gauges_by_day=gauges_by_day,
        vehicle_profile="heavy_truck",
    )

    # Route distance exceeds 1000km; arrival at Silchar occurs on Day 1
    # On Day 1, Barak has receded inside banks -> route must be passable!
    silchar_leg = next(leg for leg in scored["legs"] if leg["crossing"] == "Mahasadhu Bridge")
    assert silchar_leg["eval_day"] >= 1, f"Truck should arrive at Silchar on Day 1+, got Day {silchar_leg['eval_day']}"
    assert silchar_leg["risk"] == "OK", "Must evaluate against Day 1 gauge where river is clear"
    assert scored["verdict"] == Verdict.GO.value, f"Expected GO for post-recession arrival, got {scored['verdict']}"


@given(
    distance_km=st.floats(min_value=50.0, max_value=600.0),
)
def test_prop_terrain_kinematic_scaling(distance_km: float):
    """Property: Mountain ghat routes require >= 2.5x the transit time of plain routes of equal length."""
    from app.modules.risk.scorer import compute_transit_time_hours

    plain = compute_transit_time_hours(distance_km, terrain_class="plain")
    mountain = compute_transit_time_hours(distance_km, terrain_class="mountain_ghat")

    assert mountain["elapsed_hours"] >= plain["elapsed_hours"] * 2.5 - 0.05, (
        f"Mountain elapsed ({mountain['elapsed_hours']}h) must be >= 2.5x plain ({plain['elapsed_hours']}h) for {distance_km}km"
    )
    assert mountain["t_min_hours"] >= plain["t_min_hours"] * 1.8 - 0.05, (
        f"Mountain min transit ({mountain['t_min_hours']}h) must be >= 1.8x plain ({plain['t_min_hours']}h)"
    )
    assert mountain["t_max_hours"] >= plain["t_max_hours"] * 2.5 - 0.05, (
        f"Mountain max transit ({mountain['t_max_hours']}h) must be >= 2.5x plain ({plain['t_max_hours']}h)"
    )


@given(
    d1=st.floats(min_value=10.0, max_value=500.0),
    step=st.floats(min_value=5.0, max_value=100.0),
    terrain=st.sampled_from(["plain", "rolling", "mountain_ghat"]),
)
def test_prop_bounded_transit_interval(d1: float, step: float, terrain: str):
    """Property: Transit intervals satisfy T_min <= T_nominal <= T_max and are strictly monotonic in distance."""
    from app.modules.risk.scorer import compute_transit_time_hours

    d2 = d1 + step
    t1 = compute_transit_time_hours(d1, terrain_class=terrain)
    t2 = compute_transit_time_hours(d2, terrain_class=terrain)

    # Invariant 1: Bounded interval ordering
    assert t1["t_min_hours"] <= t1["t_nominal_hours"] + 1e-4
    assert t1["t_nominal_hours"] <= t1["t_max_hours"] + 1e-4
    assert t2["t_min_hours"] <= t2["t_nominal_hours"] + 1e-4
    assert t2["t_nominal_hours"] <= t2["t_max_hours"] + 1e-4

    # Invariant 2: Strict monotonicity with respect to distance
    assert t2["t_min_hours"] > t1["t_min_hours"]
    assert t2["t_max_hours"] > t1["t_max_hours"]
    assert t2["elapsed_hours"] > t1["elapsed_hours"]

    # Invariant 3: Velocity consistency
    assert t1["v_min_kmh"] < t1["speed_kmh"] < t1["v_max_kmh"]

