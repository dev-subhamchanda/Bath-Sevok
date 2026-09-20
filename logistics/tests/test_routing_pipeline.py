"""Automated verification suite for ORS routing, truck profiling, and convoy dispatch."""

import pytest
from app.modules.routing.ors import resolve_ors_profile
from app.modules.risk.scorer import score_route_geometry
from app.enums import Verdict, Action


def test_ors_profile_resolution():
    """Verify mapping from commercial vehicle classification to ORS routing mode."""
    assert resolve_ors_profile("light_commercial") == "driving-car"
    assert resolve_ors_profile("high_mobility_4x4") == "driving-car"
    assert resolve_ors_profile("intermediate_truck") == "driving-hgv"
    assert resolve_ors_profile("medium_truck") == "driving-hgv"
    assert resolve_ors_profile("heavy_multi_axle") == "driving-hgv"
    assert resolve_ors_profile("tractor_trailer") == "driving-hgv"
    assert resolve_ors_profile("tanker_empty") == "driving-hgv"
    assert resolve_ors_profile("tanker_laden") == "driving-hgv"
    # Legacy alias normalization
    assert resolve_ors_profile("heavy_truck") == "driving-hgv"
    assert resolve_ors_profile("tanker") == "driving-hgv"


def test_tractor_trailer_hairpin_mountain_ghat_rejection():
    """Articulated tractor-trailers must be rejected on mountain ghat corridors under IRC:SP:48."""
    # Route through Meghalaya mountain ghat corridor
    mountain_coords = [
        [91.88, 25.57],
        [91.95, 25.50],
        [92.10, 25.46],
        [92.20, 25.45],
    ]
    corridors = [{
        "corridor_id": 9,
        "name": "Meghalaya",
        "highways": "NH6",
        "terrain_class": "mountain_ghat",
        "has_reroute": False,
        "speed_kmh": 20.0,
    }]
    corridor_points = [
        {"corridor_id": 9, "point_name": "Shillong", "lon": 91.88, "lat": 25.57, "role": "chokepoint"},
        {"corridor_id": 9, "point_name": "Jowai", "lon": 92.20, "lat": 25.45, "role": "watch"},
    ]

    # 1. Rigid heavy multi-axle truck should be passable
    scored_rigid = score_route_geometry(
        mountain_coords,
        day=2,
        vehicle_profile="heavy_multi_axle",
        corridors=corridors,
        corridor_points=corridor_points,
    )
    assert scored_rigid["verdict"] == Verdict.GO.value
    assert scored_rigid["action"] == Action.PROCEED.value
    assert scored_rigid["is_passable"] is True

    # 2. Articulated tractor-trailer must be blocked with UNVIABLE_HAIRPIN_RADIUS
    scored_articulated = score_route_geometry(
        mountain_coords,
        day=2,
        vehicle_profile="tractor_trailer",
        corridors=corridors,
        corridor_points=corridor_points,
    )
    assert scored_articulated["verdict"] == Verdict.HOLD.value
    assert scored_articulated["action"] == "UNVIABLE_HAIRPIN_RADIUS"
    assert scored_articulated["is_passable"] is False
    assert scored_articulated["first_blocker"] is not None
    assert "IRC:SP:48" in scored_articulated["first_blocker"]["reason"]
    assert scored_articulated["dispatch_window"]["is_receding"] is False


def test_convoy_fleet_dispatch_scoring():
    """Heterogeneous convoy dispatch evaluates mixed fleet and identifies limiting bottleneck."""
    from fastapi.testclient import TestClient
    from app.api.server import create_app
    import os

    os.environ["ENABLE_WORKER"] = "false"
    app = create_app()
    with TestClient(app) as client:
        res = client.post("/score-routes", json={
            "routes": [
                {
                    "route_id": "test_convoy_route",
                    "points": [[91.74, 26.14], [91.88, 25.57], [92.20, 25.45]]
                }
            ],
            "day": 2,
            "vehicle_profile": "heavy_multi_axle",
            "fleet": ["light_commercial", "heavy_multi_axle", "tractor_trailer"]
        })
        assert res.status_code == 200
        data = res.json()
        assert len(data["routes"]) == 1
        route = data["routes"][0]
        assert "fleet_summary" in route
        fs = route["fleet_summary"]
        # In mountain ghat terrain, tractor_trailer triggers HOLD for entire convoy
        assert fs["convoy_verdict"] == Verdict.HOLD.value
        assert fs["convoy_passable"] is False
        assert fs["limiting_vehicle"] == "tractor_trailer"
        assert "IRC:SP:48" in fs["limiting_reason"]
