"""Hypothesis property-based tests for Northeast India freight corridors and cut-vertex vulnerability.

Literature References:
- Jenelius, E., Petersen, T., & Mats, L.G. (2006). Importance and exposure in road network
  vulnerability analysis. Transportation Research Part A: Policy and Practice, 40(7), 537-560.
- Goswami, D.C. (1985). Fluvial regime and flood hydrology of the Brahmaputra River, Assam.
- Assam State Disaster Management Authority (ASDMA): Flood Hazard Atlas of Assam (NH-37 Kaziranga Corridor).
- Central Water Commission (CWC): Barak and Brahmaputra Basin Hydrological Reports.
"""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from hypothesis import given, strategies as st
from app.modules.risk.scorer import score_route_geometry, check_linear_corridor, identify_corridor
from app.enums import Verdict


# Registered Northeast India Corridors from DuckDB
NE_CORRIDORS = [
    {"corridor_id": 1, "name": "Brahmaputra East-West", "highways": "NH27,NH37", "has_reroute": True},
    {"corridor_id": 2, "name": "Assam-Manipur", "highways": "NH37", "has_reroute": False},
    {"corridor_id": 3, "name": "Assam-Tripura", "highways": "NH44", "has_reroute": False},
    {"corridor_id": 4, "name": "Assam-Mizoram", "highways": "NH54", "has_reroute": False},
    {"corridor_id": 5, "name": "Assam-Nagaland", "highways": "NH29,NH36", "has_reroute": True},
    {"corridor_id": 6, "name": "Assam-Arunachal", "highways": "NH15", "has_reroute": False},
    {"corridor_id": 7, "name": "Sikkim", "highways": "NH10", "has_reroute": False},
    {"corridor_id": 8, "name": "Brahmaputra Islands", "highways": "NH37", "has_reroute": False},
    {"corridor_id": 9, "name": "Meghalaya", "highways": "NH6", "has_reroute": False},
]

# Chokepoints along Corridor 2 (Assam-Manipur NH37)
CORRIDOR_2_POINTS = [
    {"corridor_id": 2, "point_name": "Silchar", "river": "Barak", "lon": 92.825, "lat": 24.825, "role": "chokepoint"},
    {"corridor_id": 2, "point_name": "Noney", "river": "Irang", "lon": 93.60, "lat": 25.12, "role": "watch"},
    {"corridor_id": 2, "point_name": "Imphal", "river": "Imphal", "lon": 93.94, "lat": 24.82, "role": "secondary"},
]

# Chokepoints along Corridor 1 (Brahmaputra East-West NH27/NH37)
CORRIDOR_1_POINTS = [
    {"corridor_id": 1, "point_name": "Guwahati", "river": "Brahmaputra", "lon": 91.675, "lat": 26.175, "role": "chokepoint"},
    {"corridor_id": 1, "point_name": "Tezpur", "river": "Brahmaputra", "lon": 92.725, "lat": 26.625, "role": "chokepoint"},
    {"corridor_id": 1, "point_name": "Dibrugarh", "river": "Brahmaputra", "lon": 94.875, "lat": 27.525, "role": "chokepoint"},
]

ALL_POINTS = CORRIDOR_1_POINTS + CORRIDOR_2_POINTS


# ---------------------------------------------------------------------------
# 1. Cut-Vertex Network Vulnerability Invariants (Jenelius et al. 2006)
# ---------------------------------------------------------------------------

@given(
    q_excess_ratio=st.floats(min_value=1.05, max_value=2.5),
)
def test_prop_cut_vertex_halt_and_stage(q_excess_ratio: float):
    """Property: Blockage on a non-reroutable corridor (has_reroute == False) must trigger HALT_AND_STAGE."""
    # Route traversing Corridor 2 (Silchar -> Noney -> Imphal)
    route_points = [[92.82, 24.82], [93.60, 25.12], [93.94, 24.82]]

    # Flooded Barak River at Silchar
    gauges = [{
        "gauge": "Silchar_gauge",
        "river": "Barak",
        "cell_lon": 92.825,
        "cell_lat": 24.825,
        "q_mean": 2000.0 * q_excess_ratio,
        "q_p50": 1950.0 * q_excess_ratio,
        "q_p90": 2100.0 * q_excess_ratio,
        "rp2": 1500.0,
        "rp5": 2000.0,
        "load_ratio": q_excess_ratio,
        "p_rp2": 0.99,
        "p_rp5": 0.85,
        "p_rp10": 0.50,
        "trend": "RISING",
        "risk": "HIGH",
    }]
    crossings = [{
        "name": "Mahasadhu Bridge",
        "river": "Barak",
        "lon": 92.82,
        "lat": 24.82,
    }]

    scored = score_route_geometry(
        points=route_points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        corridors=NE_CORRIDORS,
        corridor_points=ALL_POINTS,
        vehicle_profile="heavy_truck",
    )

    assert scored["verdict"] == Verdict.HOLD.value, "Must be HOLD"
    assert scored["corridor"] is not None, "Corridor must be recognized"
    assert scored["corridor"]["corridor_id"] == 2, "Must identify Corridor 2 (Assam-Manipur)"
    assert scored["corridor"]["has_reroute"] is False, "Corridor 2 has no alternate route"
    # Jenelius cut-vertex rule: single lifeline failure forces HALT_AND_STAGE
    assert scored["action"] == "HALT_AND_STAGE", f"Expected HALT_AND_STAGE, got {scored['action']}"


@given(
    q_excess_ratio=st.floats(min_value=1.05, max_value=2.5),
)
def test_prop_ring_corridor_reroute(q_excess_ratio: float):
    """Property: Blockage on a corridor with network redundancy (has_reroute == True) must trigger REROUTE."""
    # Route traversing Corridor 1 (Guwahati -> Tezpur -> Dibrugarh)
    route_points = [[91.68, 26.17], [92.73, 26.62], [94.88, 27.52]]

    gauges = [{
        "gauge": "Tezpur_gauge",
        "river": "Brahmaputra",
        "cell_lon": 92.725,
        "cell_lat": 26.625,
        "q_mean": 52000.0 * q_excess_ratio,
        "q_p50": 51000.0 * q_excess_ratio,
        "q_p90": 54000.0 * q_excess_ratio,
        "rp2": 38000.0,
        "rp5": 52000.0,
        "load_ratio": q_excess_ratio,
        "p_rp2": 0.99,
        "p_rp5": 0.90,
        "p_rp10": 0.60,
        "trend": "RISING",
        "risk": "HIGH",
    }]
    crossings = [{
        "name": "Kolia Bhomora Bridge",
        "river": "Brahmaputra",
        "lon": 92.73,
        "lat": 26.62,
    }]

    scored = score_route_geometry(
        points=route_points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        corridors=NE_CORRIDORS,
        corridor_points=ALL_POINTS,
        vehicle_profile="heavy_truck",
    )

    assert scored["verdict"] == Verdict.HOLD.value, "Must be HOLD"
    assert scored["corridor"] is not None, "Corridor must be recognized"
    assert scored["corridor"]["corridor_id"] == 1, "Must identify Corridor 1 (Brahmaputra East-West)"
    assert scored["corridor"]["has_reroute"] is True, "Corridor 1 has parallel alternate highway (NH15)"
    # Ring network redundancy rule: disruption triggers REROUTE
    assert scored["action"] == "REROUTE", f"Expected REROUTE, got {scored['action']}"


# ---------------------------------------------------------------------------
# 2. Kaziranga Linear Corridor Extent Invariant (ASDMA Atlas)
# ---------------------------------------------------------------------------

@given(
    lon=st.floats(min_value=92.90, max_value=93.65),
    lat=st.floats(min_value=26.50, max_value=26.70),
)
def test_prop_kaziranga_floodplain_extent(lon: float, lat: float):
    """Property: Any point within the 40km Kaziranga NH37 corridor must trigger linear corridor hazard."""
    corridor = check_linear_corridor(lon, lat)
    assert corridor is not None, f"Point ({lon}, {lat}) in Kaziranga bbox must trigger corridor"
    assert corridor["name"] == "Kaziranga NH37 Floodplain Stretch"
    assert corridor["river"] == "Brahmaputra"


@given(
    lon=st.floats(min_value=91.0, max_value=92.80),
    lat=st.floats(min_value=25.0, max_value=26.40),
)
def test_prop_outside_kaziranga_no_false_positive(lon: float, lat: float):
    """Property: Points outside Kaziranga bounding box must never falsely trigger Kaziranga stretch."""
    corridor = check_linear_corridor(lon, lat)
    assert corridor is None, f"Point ({lon}, {lat}) outside Kaziranga must not trigger corridor"
