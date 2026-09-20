"""Verification suite for ORS proactive route avoidance and dynamic hazard registry.

Validates:
1. Spatial pre-flight filtering (corridor buffer and two-pass intersection).
2. Endpoint proximity safeguards protecting against ORS 400 errors.
3. MultiPolygon GeoJSON construction.
4. Hazard registry API lifecycle (POST, GET, DELETE).
5. Dispatch avoidance integration with cut-vertex network severance fallback.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.api.server import app
from app.modules.routing.ors import (
    point_to_bbox,
    bbox_to_polygon_ring,
    normalize_hazard,
    filter_hazards_by_corridor,
    filter_start_end_proximity,
    filter_hazards_by_polyline_intersection,
    build_avoid_multipolygon,
    RouteBlockedException,
)

client = TestClient(app)


def test_point_to_bbox_and_ring():
    """Verify conversion from coordinate point and radius to bounding box and closed ring."""
    lon, lat = 91.74, 26.14
    bbox = point_to_bbox(lon, lat, radius_km=5.0)
    assert len(bbox) == 4
    min_lon, min_lat, max_lon, max_lat = bbox
    assert min_lon < lon < max_lon
    assert min_lat < lat < max_lat

    ring = bbox_to_polygon_ring(min_lon, min_lat, max_lon, max_lat)
    assert len(ring) == 5
    assert ring[0] == ring[-1]
    assert ring[0] == [min_lon, min_lat]
    assert ring[2] == [max_lon, max_lat]


def test_hazard_normalization_formats():
    """Verify uniform normalization across bbox, point, polygon, and DB records."""
    # 1. Bounding box list
    h1 = normalize_hazard([91.5, 25.5, 91.8, 25.8])
    assert h1["geometry_type"] == "bbox"
    assert h1["bbox"] == [91.5, 25.5, 91.8, 25.8]
    assert len(h1["ring"]) == 5

    # 2. Point dict
    h2 = normalize_hazard({"name": "Landslide Spot", "point": [92.0, 25.5], "radius_km": 2.0})
    assert h2["geometry_type"] == "point"
    assert h2["name"] == "Landslide Spot"
    assert len(h2["ring"]) == 5

    # 3. Polygon dict
    h3 = normalize_hazard({
        "name": "Flooded Basin",
        "polygon": [[91.8, 25.4], [92.1, 25.4], [92.1, 25.6], [91.8, 25.6]],
    })
    assert h3["geometry_type"] == "polygon"
    assert h3["name"] == "Flooded Basin"
    assert len(h3["ring"]) == 5
    assert h3["ring"][0] == h3["ring"][-1]

    # 4. DuckDB record dict
    h4 = normalize_hazard({
        "hazard_id": "haz-100",
        "name": "DB Roadblock",
        "geometry_type": "bbox",
        "lon_min": 92.1,
        "lat_min": 25.3,
        "lon_max": 92.3,
        "lat_max": 25.5,
        "hazard_type": "roadblock",
        "severity": "CRITICAL",
    })
    assert h4["hazard_id"] == "haz-100"
    assert h4["bbox"] == [92.1, 25.3, 92.3, 25.5]


def test_corridor_preflight_filtering():
    """Corridor pre-flight buffer must prune distant hazards without knowing the path geometry."""
    # Route from Guwahati to Silchar (Assam/Meghalaya axis)
    start = [91.74, 26.14]
    end = [92.80, 24.83]

    hazards = [
        # Hazard along the Meghalaya corridor (relevant)
        normalize_hazard([92.10, 25.40, 92.30, 25.60]),
        # Hazard in Sikkim/North Bengal (approx 350 km west: irrelevant)
        normalize_hazard([88.40, 27.10, 88.60, 27.30]),
        # Hazard near Myanmar border in eastern Arunachal (approx 400 km northeast: irrelevant)
        normalize_hazard([96.00, 27.50, 96.20, 27.70]),
    ]

    filtered = filter_hazards_by_corridor(hazards, start, end, buffer_km=50.0)
    assert len(filtered) == 1
    assert filtered[0]["bbox"] == [92.10, 25.40, 92.30, 25.60]


def test_start_end_proximity_safeguard():
    """Exclude hazards that enclose or sit dangerously close to route start or end."""
    start = [91.74, 26.14]
    end = [92.80, 24.83]

    hazards = [
        # Hazard enclosing origin (would trigger ORS 400)
        normalize_hazard([91.70, 26.10, 91.78, 26.18]),
        # Hazard 500m from destination (would trigger ORS 400)
        normalize_hazard({"point": [92.802, 24.832], "radius_km": 0.5}),
        # Safe intermediate hazard 40km away
        normalize_hazard({"point": [92.10, 25.50], "radius_km": 2.0}),
    ]

    safe_hazards = filter_start_end_proximity(hazards, start, end, min_dist_km=1.5)
    assert len(safe_hazards) == 1
    assert safe_hazards[0]["geometry_type"] == "point"


def test_polyline_intersection_filtering():
    """Identify hazards whose buffered boundaries intersect the baseline polyline."""
    polyline = [
        [91.74, 26.14],
        [91.95, 25.80],
        [92.20, 25.45],
        [92.80, 24.83],
    ]

    h_intersect = normalize_hazard({"point": [92.20, 25.45], "radius_km": 2.0})
    h_distant = normalize_hazard({"point": [91.20, 25.45], "radius_km": 2.0})

    intersecting = filter_hazards_by_polyline_intersection([h_intersect, h_distant], polyline, buffer_km=2.0)
    assert len(intersecting) == 1
    assert intersecting[0]["bbox"] == h_intersect["bbox"]


def test_build_avoid_multipolygon():
    """Verify GeoJSON MultiPolygon structure formatted for ORS options.avoid_polygons."""
    h1 = normalize_hazard([91.5, 25.5, 91.8, 25.8])
    h2 = normalize_hazard([92.0, 25.2, 92.2, 25.4])

    geo = build_avoid_multipolygon([h1, h2], max_polygons=5)
    assert geo is not None
    assert geo["type"] == "MultiPolygon"
    assert len(geo["coordinates"]) == 2
    # GeoJSON MultiPolygon coordinates array: [ [ ring1 ], [ ring2 ] ]
    assert len(geo["coordinates"][0]) == 1
    assert len(geo["coordinates"][0][0]) == 5


def test_hazard_api_lifecycle():
    """Test full CRUD lifecycle for dynamic hazard registry via REST endpoints."""
    # 1. Create a dynamic hazard
    create_payload = {
        "name": "Barapani Inundation Hazard",
        "hazard_type": "flood",
        "severity": "CRITICAL",
        "point": [91.90, 25.65],
        "radius_km": 3.0,
        "expires_hours": 12.0,
    }
    r_post = client.post("/hazards", json=create_payload)
    assert r_post.status_code == 200, r_post.text
    haz_data = r_post.json()
    assert haz_data["name"] == "Barapani Inundation Hazard"
    assert haz_data["geometry_type"] == "point"
    assert haz_data["active"] is True
    hazard_id = haz_data["hazard_id"]

    # 2. Query dynamic hazards list
    r_list = client.get("/hazards")
    assert r_list.status_code == 200
    list_data = r_list.json()
    assert list_data["total"] >= 1
    ids = [h["hazard_id"] for h in list_data["hazards"]]
    assert hazard_id in ids

    # 3. Query with spatial bbox filter
    # Matching bbox
    r_match = client.get("/hazards?bbox=91.80,25.50,92.00,25.80")
    assert r_match.status_code == 200
    assert any(h["hazard_id"] == hazard_id for h in r_match.json()["hazards"])

    # Non-matching bbox far away
    r_nomatch = client.get("/hazards?bbox=88.00,26.00,89.00,27.00")
    assert r_nomatch.status_code == 200
    assert not any(h["hazard_id"] == hazard_id for h in r_nomatch.json()["hazards"])

    # 4. Delete the dynamic hazard
    r_del = client.delete(f"/hazards/{hazard_id}")
    assert r_del.status_code == 200
    del_data = r_del.json()
    assert del_data["deleted"] is True
    assert del_data["hazard_id"] == hazard_id

    # 5. Verify deletion
    r_del_again = client.delete(f"/hazards/{hazard_id}")
    assert r_del_again.status_code == 404


def test_dispatch_avoidance_integration():
    """Verify POST /dispatch with avoid_boxes scores affected routes as impassable."""
    # Route 1 passes straight through the hazard zone
    # Route 2 takes a wider detour that avoids the hazard zone
    hazard_bbox = [92.05, 25.40, 92.15, 25.50]

    payload = {
        "start": [91.74, 26.14],
        "end": [92.80, 24.83],
        "day": 2,
        "avoid_boxes": [hazard_bbox],
        "routes": [
            # Traverses hazard at [92.10, 25.45]
            {"route_id": "blocked_route", "points": [[91.74, 26.14], [92.10, 25.45], [92.80, 24.83]]},
            # Detours via Jowai north avoiding hazard
            {"route_id": "clear_route", "points": [[91.74, 26.14], [92.30, 25.60], [92.80, 24.83]]},
        ],
    }
    resp = client.post("/dispatch", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    routes_by_id = {r["route_id"]: r for r in data["routes"]}
    assert "blocked_route" in routes_by_id
    assert "clear_route" in routes_by_id

    blocked = routes_by_id["blocked_route"]
    clear = routes_by_id["clear_route"]

    # Blocked route must register active roadblock and HOLD verdict
    assert blocked["verdict"] == "HOLD"
    assert blocked["p_roadblock"] == 1.0
    assert blocked["first_blocker"] is not None
    assert len(blocked["intersected_hazards"]) == 1
    assert blocked["intersected_hazards"][0]["km_from_start"] is not None
    assert len(clear["intersected_hazards"]) == 0
    assert len(data["intersected_hazards"]) == 1

    # Clear route should have lower closure likelihood and be recommended
    assert data["recommendation"] == "clear_route"
    assert data["ranking"][0] == "clear_route"


def test_dispatch_hazard_points_raw_coords():
    """Verify passing hazard_points as raw coordinate pairs [lon, lat] without local DB storage."""
    payload = {
        "start": [91.74, 26.14],
        "end": [92.80, 24.83],
        "day": 2,
        "hazard_points": [
            [92.10, 25.45],
        ],
        "routes": [
            # Intersects hazard point at [92.10, 25.45]
            {"route_id": "route_hit", "points": [[91.74, 26.14], [92.10, 25.45], [92.80, 24.83]]},
            # Bypasses hazard point
            {"route_id": "route_safe", "points": [[91.74, 26.14], [92.50, 25.80], [92.80, 24.83]]},
        ],
    }
    resp = client.post("/dispatch", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    routes_by_id = {r["route_id"]: r for r in data["routes"]}
    assert "route_hit" in routes_by_id
    assert "route_safe" in routes_by_id

    hit_route = routes_by_id["route_hit"]
    safe_route = routes_by_id["route_safe"]

    # Blocked route must register intersected_hazards and HOLD verdict
    assert hit_route["verdict"] == "HOLD"
    assert hit_route["action"] == "HALT_AND_STAGE"
    assert hit_route["p_roadblock"] == 1.0
    assert len(hit_route["intersected_hazards"]) == 1
    hit_haz = hit_route["intersected_hazards"][0]
    assert hit_haz["km_from_start"] > 0
    assert "Hazard Point" in hit_haz["name"]

    # Top-level response should also list all intersected hazards
    assert len(data["intersected_hazards"]) == 1
    assert data["intersected_hazards"][0]["hazard_id"] == hit_haz["hazard_id"]

    # Safe route has no intersected hazards
    assert len(safe_route["intersected_hazards"]) == 0
    assert safe_route["verdict"] in ("GO", "CAUTION")
    assert data["recommendation"] == "route_safe"


def test_dispatch_multiple_hazard_pairs():
    """Verify dispatching with multiple hazard coordinate pairs and segment pairs."""
    payload = {
        "start": [91.74, 26.14],
        "end": [92.80, 24.83],
        "day": 2,
        # Multiple pairs: 2 individual points and 1 segment pair
        "hazard_points": [
            [92.00, 25.75],
            [92.30, 25.30],
            [[92.40, 25.10], [92.45, 25.05]],
        ],
        "routes": [
            # Traverses first point at [92.00, 25.75] and second point at [92.30, 25.30]
            {
                "route_id": "multi_hit_route",
                "points": [
                    [91.74, 26.14],
                    [92.00, 25.75],
                    [92.30, 25.30],
                    [92.80, 24.83],
                ],
            },
            # Traverses the segment pair near [92.42, 25.08]
            {
                "route_id": "segment_hit_route",
                "points": [
                    [91.74, 26.14],
                    [92.10, 25.60],
                    [92.42, 25.08],
                    [92.80, 24.83],
                ],
            },
            # Clear detour route avoiding all three hazards
            {
                "route_id": "fully_clear_route",
                "points": [
                    [91.74, 26.14],
                    [92.60, 26.00],
                    [92.80, 24.83],
                ],
            },
        ],
    }
    resp = client.post("/dispatch", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    routes_by_id = {r["route_id"]: r for r in data["routes"]}
    assert "multi_hit_route" in routes_by_id
    assert "segment_hit_route" in routes_by_id
    assert "fully_clear_route" in routes_by_id

    multi_hit = routes_by_id["multi_hit_route"]
    segment_hit = routes_by_id["segment_hit_route"]
    clear = routes_by_id["fully_clear_route"]

    # multi_hit_route crosses 2 distinct hazard points
    assert len(multi_hit["intersected_hazards"]) == 2
    assert multi_hit["verdict"] == "HOLD"
    # Verify hits are sorted chronologically by km_from_start
    km0 = multi_hit["intersected_hazards"][0]["km_from_start"]
    km1 = multi_hit["intersected_hazards"][1]["km_from_start"]
    assert km0 < km1
    # first_blocker should point to the earliest bottleneck (km0)
    assert multi_hit["first_blocker"]["km"] == km0

    # segment_hit_route crosses the segment pair
    assert len(segment_hit["intersected_hazards"]) == 1
    assert segment_hit["verdict"] == "HOLD"
    assert "Hazard Segment" in segment_hit["intersected_hazards"][0]["name"]

    # fully_clear_route should be unaffected and recommended
    assert len(clear["intersected_hazards"]) == 0
    assert clear["verdict"] in ("GO", "CAUTION")
    assert data["recommendation"] == "fully_clear_route"

    # Top-level response should list all 3 distinct intersected hazards across routes
    assert len(data["intersected_hazards"]) == 3
