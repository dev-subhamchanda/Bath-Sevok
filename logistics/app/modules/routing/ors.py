"""OpenRouteService (ORS) API client for driving directions, truck profiling, and alternates."""

from __future__ import annotations

import math
import json
from typing import List, Dict, Any, Optional
import httpx
from app.settings import settings
from app.enums import normalize_vehicle_profile
from app.modules.risk.geo import haversine_km


class RouteBlockedException(RuntimeError):
    """Raised when ORS cannot find any valid path avoiding specified hazard polygons."""


def point_to_bbox(lon: float, lat: float, radius_km: float = 2.5) -> list[float]:
    """Convert center coordinate and radius into bounding box [min_lon, min_lat, max_lon, max_lat]."""
    d_lat = radius_km / 111.0
    cos_lat = max(0.01, math.cos(math.radians(lat)))
    d_lon = radius_km / (111.0 * cos_lat)
    return [round(lon - d_lon, 6), round(lat - d_lat, 6), round(lon + d_lon, 6), round(lat + d_lat, 6)]


def bbox_to_polygon_ring(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> list[list[float]]:
    """Convert bounding box coordinates to a 5-point closed polygon ring."""
    return [
        [round(min_lon, 6), round(min_lat, 6)],
        [round(max_lon, 6), round(min_lat, 6)],
        [round(max_lon, 6), round(max_lat, 6)],
        [round(min_lon, 6), round(max_lat, 6)],
        [round(min_lon, 6), round(min_lat, 6)],
    ]


def normalize_hazard(hazard: Any) -> Dict[str, Any]:
    """Normalize ad-hoc or registry hazard into canonical dict with bbox and closed polygon ring."""
    if isinstance(hazard, (list, tuple)):
        if len(hazard) == 2 and all(isinstance(x, (int, float)) for x in hazard):
            lon, lat = float(hazard[0]), float(hazard[1])
            b = point_to_bbox(lon, lat, radius_km=2.5)
            h_id = f"pt-{abs(hash((lon, lat))) % 1000000}"
            return {
                "hazard_id": h_id,
                "name": f"Hazard Point ({lon}, {lat})",
                "geometry_type": "point",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": "roadblock",
                "severity": "CRITICAL",
            }
        if len(hazard) == 2 and all(isinstance(p, (list, tuple)) and len(p) >= 2 for p in hazard):
            p1, p2 = hazard[0], hazard[1]
            lon1, lat1 = float(p1[0]), float(p1[1])
            lon2, lat2 = float(p2[0]), float(p2[1])
            min_lon, max_lon = min(lon1, lon2), max(lon1, lon2)
            min_lat, max_lat = min(lat1, lat2), max(lat1, lat2)
            d_lat = 2.5 / 111.0
            mean_lat = (min_lat + max_lat) / 2.0
            cos_lat = max(0.01, math.cos(math.radians(mean_lat)))
            d_lon = 2.5 / (111.0 * cos_lat)
            b = [round(min_lon - d_lon, 6), round(min_lat - d_lat, 6), round(max_lon + d_lon, 6), round(max_lat + d_lat, 6)]
            h_id = f"pair-{abs(hash((lon1, lat1, lon2, lat2))) % 1000000}"
            return {
                "hazard_id": h_id,
                "name": f"Hazard Segment ({lon1:.2f}, {lat1:.2f}) to ({lon2:.2f}, {lat2:.2f})",
                "geometry_type": "segment",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": "roadblock",
                "severity": "CRITICAL",
            }
        if len(hazard) == 4 and all(isinstance(x, (int, float)) for x in hazard):
            b = [float(x) for x in hazard]
            return {
                "hazard_id": "adhoc-bbox",
                "name": "Bounding Box Hazard",
                "geometry_type": "bbox",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": "roadblock",
                "severity": "CRITICAL",
            }
        if len(hazard) >= 3 and all(isinstance(p, (list, tuple)) and len(p) >= 2 for p in hazard):
            ring = [[float(p[0]), float(p[1])] for p in hazard]
            if ring[0] != ring[-1]:
                ring.append(list(ring[0]))
            min_lon = min(p[0] for p in ring)
            min_lat = min(p[1] for p in ring)
            max_lon = max(p[0] for p in ring)
            max_lat = max(p[1] for p in ring)
            return {
                "hazard_id": "adhoc-poly",
                "name": "Polygon Hazard",
                "geometry_type": "polygon",
                "bbox": [min_lon, min_lat, max_lon, max_lat],
                "ring": ring,
                "hazard_type": "roadblock",
                "severity": "CRITICAL",
            }

    if isinstance(hazard, dict):
        h_id = str(hazard.get("hazard_id") or "adhoc")
        name = str(hazard.get("name") or "Hazard")
        h_type = str(hazard.get("hazard_type") or "roadblock")
        sev = str(hazard.get("severity") or "CRITICAL")

        if "bbox" in hazard and hazard["bbox"] and len(hazard["bbox"]) == 4:
            b = [float(x) for x in hazard["bbox"]]
            return {
                "hazard_id": h_id,
                "name": name,
                "geometry_type": "bbox",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": h_type,
                "severity": sev,
            }

        if "lon_min" in hazard and "lat_min" in hazard and "lon_max" in hazard and "lat_max" in hazard:
            b = [float(hazard["lon_min"]), float(hazard["lat_min"]), float(hazard["lon_max"]), float(hazard["lat_max"])]
            ring = bbox_to_polygon_ring(b[0], b[1], b[2], b[3])
            if hazard.get("polygon_geojson"):
                try:
                    pj = json.loads(hazard["polygon_geojson"]) if isinstance(hazard["polygon_geojson"], str) else hazard["polygon_geojson"]
                    if pj.get("type") == "Polygon" and pj.get("coordinates"):
                        parsed_ring = pj["coordinates"][0]
                        if len(parsed_ring) >= 3:
                            ring = [[float(p[0]), float(p[1])] for p in parsed_ring]
                            if ring[0] != ring[-1]:
                                ring.append(list(ring[0]))
                except Exception:
                    pass
            return {
                "hazard_id": h_id,
                "name": name,
                "geometry_type": str(hazard.get("geometry_type") or "bbox"),
                "bbox": b,
                "ring": ring,
                "hazard_type": h_type,
                "severity": sev,
            }

        if "point" in hazard and hazard["point"] and len(hazard["point"]) >= 2:
            pt = hazard["point"]
            r_km = float(hazard.get("radius_km") or 2.5)
            b = point_to_bbox(float(pt[0]), float(pt[1]), r_km)
            return {
                "hazard_id": h_id,
                "name": name,
                "geometry_type": "point",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": h_type,
                "severity": sev,
            }
        if "lon" in hazard and "lat" in hazard:
            r_km = float(hazard.get("radius_km") or 2.5)
            b = point_to_bbox(float(hazard["lon"]), float(hazard["lat"]), r_km)
            return {
                "hazard_id": h_id,
                "name": name,
                "geometry_type": "point",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": h_type,
                "severity": sev,
            }

        pair_pts = hazard.get("pair") or (hazard.get("points") if isinstance(hazard.get("points"), (list, tuple)) and len(hazard.get("points")) == 2 else None)
        if pair_pts and len(pair_pts) == 2:
            p1, p2 = pair_pts[0], pair_pts[1]
            lon1, lat1 = float(p1[0]), float(p1[1])
            lon2, lat2 = float(p2[0]), float(p2[1])
            r_km = float(hazard.get("radius_km") or 2.5)
            min_lon, max_lon = min(lon1, lon2), max(lon1, lon2)
            min_lat, max_lat = min(lat1, lat2), max(lat1, lat2)
            d_lat = r_km / 111.0
            mean_lat = (min_lat + max_lat) / 2.0
            cos_lat = max(0.01, math.cos(math.radians(mean_lat)))
            d_lon = r_km / (111.0 * cos_lat)
            b = [round(min_lon - d_lon, 6), round(min_lat - d_lat, 6), round(max_lon + d_lon, 6), round(max_lat + d_lat, 6)]
            return {
                "hazard_id": h_id,
                "name": name,
                "geometry_type": "segment",
                "bbox": b,
                "ring": bbox_to_polygon_ring(b[0], b[1], b[2], b[3]),
                "hazard_type": h_type,
                "severity": sev,
            }

        if "polygon" in hazard and hazard["polygon"] and len(hazard["polygon"]) >= 3:
            ring = [[float(p[0]), float(p[1])] for p in hazard["polygon"]]
            if ring[0] != ring[-1]:
                ring.append(list(ring[0]))
            min_lon = min(p[0] for p in ring)
            min_lat = min(p[1] for p in ring)
            max_lon = max(p[0] for p in ring)
            max_lat = max(p[1] for p in ring)
            return {
                "hazard_id": h_id,
                "name": name,
                "geometry_type": "polygon",
                "bbox": [min_lon, min_lat, max_lon, max_lat],
                "ring": ring,
                "hazard_type": h_type,
                "severity": sev,
            }

    raise ValueError(f"Unsupported hazard representation: {hazard}")


def filter_hazards_by_corridor(
    hazards: List[Dict[str, Any]],
    start: List[float],
    end: List[float],
    buffer_km: float = 50.0,
) -> List[Dict[str, Any]]:
    """Filter hazards to those intersecting the route bounding box expanded by corridor buffer."""
    if not hazards:
        return []
    min_lon = min(start[0], end[0])
    max_lon = max(start[0], end[0])
    min_lat = min(start[1], end[1])
    max_lat = max(start[1], end[1])

    mean_lat = (min_lat + max_lat) / 2.0
    d_lat = buffer_km / 111.0
    cos_lat = max(0.01, math.cos(math.radians(mean_lat)))
    d_lon = buffer_km / (111.0 * cos_lat)

    c_min_lon = min_lon - d_lon
    c_max_lon = max_lon + d_lon
    c_min_lat = min_lat - d_lat
    c_max_lat = max_lat + d_lat

    filtered = []
    for h in hazards:
        b = h["bbox"]
        if not (b[2] < c_min_lon or b[0] > c_max_lon or b[3] < c_min_lat or b[1] > c_max_lat):
            filtered.append(h)
    return filtered


def filter_start_end_proximity(
    hazards: List[Dict[str, Any]],
    start: List[float],
    end: List[float],
    min_dist_km: float = 1.5,
) -> List[Dict[str, Any]]:
    """Exclude hazards whose boundaries enclose or sit within min_dist_km of route start or end."""
    if not hazards:
        return []

    safe_hazards = []
    for h in hazards:
        b = h["bbox"]
        h_center_lon = (b[0] + b[2]) / 2.0
        h_center_lat = (b[1] + b[3]) / 2.0

        start_inside = (b[0] <= start[0] <= b[2] and b[1] <= start[1] <= b[3])
        end_inside = (b[0] <= end[0] <= b[2] and b[1] <= end[1] <= b[3])
        if start_inside or end_inside:
            continue

        d_start_center = haversine_km(start[0], start[1], h_center_lon, h_center_lat)
        d_end_center = haversine_km(end[0], end[1], h_center_lon, h_center_lat)
        if d_start_center < min_dist_km or d_end_center < min_dist_km:
            continue

        too_close = False
        for vx, vy in h["ring"]:
            if haversine_km(start[0], start[1], vx, vy) < min_dist_km:
                too_close = True
                break
            if haversine_km(end[0], end[1], vx, vy) < min_dist_km:
                too_close = True
                break

        if not too_close:
            safe_hazards.append(h)

    return safe_hazards


def filter_hazards_by_polyline_intersection(
    hazards: List[Dict[str, Any]],
    polyline: List[List[float]],
    buffer_km: float = 2.0,
) -> List[Dict[str, Any]]:
    """Identify hazards whose buffered boundaries intersect the given polyline."""
    if not hazards or not polyline:
        return []

    pts = polyline if len(polyline) <= 200 else polyline[::max(1, len(polyline) // 150)]

    intersecting = []
    for h in hazards:
        b = h["bbox"]
        d_lat = buffer_km / 111.0
        mean_lat = (b[1] + b[3]) / 2.0
        cos_lat = max(0.01, math.cos(math.radians(mean_lat)))
        d_lon = buffer_km / (111.0 * cos_lat)

        exp_min_lon = b[0] - d_lon
        exp_max_lon = b[2] + d_lon
        exp_min_lat = b[1] - d_lat
        exp_max_lat = b[3] + d_lat

        hit = False
        for px, py in pts:
            if exp_min_lon <= px <= exp_max_lon and exp_min_lat <= py <= exp_max_lat:
                hit = True
                break

        if hit:
            intersecting.append(h)

    return intersecting


def build_avoid_multipolygon(
    hazards: List[Dict[str, Any]],
    max_polygons: int = 50,
) -> Optional[Dict[str, Any]]:
    """Convert list of normalized hazards into GeoJSON MultiPolygon for ORS options.avoid_polygons."""
    if not hazards:
        return None
    selected = hazards[:max_polygons]
    coordinates = [[h["ring"]] for h in selected]
    return {
        "type": "MultiPolygon",
        "coordinates": coordinates,
    }


def check_route_hazard_intersections(
    coords_with_km: List[Tuple[float, float, float]],
    hazards: List[Dict[str, Any]],
    buffer_km: float = 1.0,
) -> List[Dict[str, Any]]:
    """Check which hazards intersect the given route polyline, and at what kilometer mark."""
    hits = []
    seen_ids = set()
    for h in hazards:
        h_id = str(h.get("hazard_id") or "adhoc")
        if h_id in seen_ids:
            continue
        b = h["bbox"]
        d_lat = buffer_km / 111.0
        mean_lat = (b[1] + b[3]) / 2.0
        cos_lat = max(0.01, math.cos(math.radians(mean_lat)))
        d_lon = buffer_km / (111.0 * cos_lat)

        exp_min_lon = b[0] - d_lon
        exp_max_lon = b[2] + d_lon
        exp_min_lat = b[1] - d_lat
        exp_max_lat = b[3] + d_lat

        for lon, lat, km in coords_with_km:
            if exp_min_lon <= lon <= exp_max_lon and exp_min_lat <= lat <= exp_max_lat:
                seen_ids.add(h_id)
                hits.append({
                    "hazard_id": h_id,
                    "name": h.get("name", "Road Hazard"),
                    "hazard_type": h.get("hazard_type", "roadblock"),
                    "severity": h.get("severity", "CRITICAL"),
                    "km_from_start": round(km, 1),
                    "location": f"{h.get('name', 'Hazard')} at KM {round(km, 1)}",
                    "bbox": h["bbox"],
                })
                break
    hits.sort(key=lambda x: x.get("km_from_start", 0.0))
    return hits


def resolve_ors_profile(vehicle_profile: str | None = None) -> str:
    """Select ORS routing profile based on commercial vehicle physical classification."""
    norm = normalize_vehicle_profile(vehicle_profile or "")
    if norm in ("light_commercial", "high_mobility_4x4"):
        return "driving-car"
    return "driving-hgv"


async def _fetch_corridor_detour_route(
    client: httpx.AsyncClient,
    base_url: str,
    headers: Dict[str, str],
    start: list[float],
    end: list[float],
    primary_coords: list[list[float]],
) -> Optional[Dict[str, Any]]:
    """Discover intermediate freight node to generate secondary corridor trajectory for hauls > 100km."""
    d_direct = haversine_km(start[0], start[1], end[0], end[1])
    if d_direct < 75.0 or not primary_coords:
        return None

    try:
        from app.db.connection import read_cursor
        with read_cursor() as con:
            rows = con.execute(
                "SELECT name, orig_lon, orig_lat FROM logistics_points "
                "UNION SELECT point_name, lon, lat FROM corridor_points"
            ).fetchall()
    except Exception:
        return None

    candidates = []
    for name, w_lon, w_lat in rows:
        d1 = haversine_km(start[0], start[1], w_lon, w_lat)
        d2 = haversine_km(w_lon, w_lat, end[0], end[1])
        if d1 > 25.0 and d2 > 25.0 and (d1 + d2) < 1.75 * d_direct:
            candidates.append((name, w_lon, w_lat, d1 + d2))

    candidates.sort(key=lambda x: x[3])
    subsampled_primary = primary_coords[::max(1, len(primary_coords) // 40)]

    for name, w_lon, w_lat, _ in candidates[:8]:
        min_d_to_primary = min(haversine_km(w_lon, w_lat, px, py) for px, py in subsampled_primary)
        if min_d_to_primary > 25.0:
            alt_body: Dict[str, Any] = {
                "coordinates": [start, [w_lon, w_lat], end],
                "radiuses": [2500, 5000, 2500],
                "elevation": False,
                "instructions": False,
            }
            try:
                r_alt = await client.post(base_url, json=alt_body, headers=headers)
                if r_alt.status_code == 200:
                    data_alt = r_alt.json()
                    feats = data_alt.get("features", [])
                    if feats:
                        props = feats[0].get("properties", {})
                        summ = props.get("summary", {})
                        geom = feats[0].get("geometry", {})
                        coords = geom.get("coordinates", [])
                        return {
                            "route_id": "ors-1",
                            "points": coords,
                            "distance_km": round(summ.get("distance", 0) / 1000.0, 1),
                            "duration_min": round(summ.get("duration", 0) / 60.0, 1),
                            "via_waypoint": name,
                        }
            except Exception:
                continue

    return None


async def fetch_ors_routes(
    start: list[float],
    end: list[float],
    key: str | None = None,
    alternates: int = 2,
    vehicle_profile: str | None = None,
    avoid_polygons: dict[str, Any] | None = None,
) -> List[Dict[str, Any]]:
    """Query OpenRouteService for primary and alternative driving routes with HGV and error-handling."""
    api_key = key or settings.routing.ors_api_key
    if not api_key:
        raise ValueError("Missing ORS API key. Configure ORS_API_KEY or supply in request.")

    ors_prof = resolve_ors_profile(vehicle_profile)
    endpoint_url = settings.routing.ors_api_url
    for p in ("driving-car", "driving-hgv"):
        if p in endpoint_url:
            endpoint_url = endpoint_url.replace(p, ors_prof)
            break

    body: Dict[str, Any] = {
        "coordinates": [start, end],
        "radiuses": [2500, 2500],
        "elevation": False,
        "instructions": False,
    }
    if avoid_polygons:
        body["options"] = {"avoid_polygons": avoid_polygons}

    if alternates > 0:
        target_count = min(3, max(2, alternates + 1))
        body["alternative_routes"] = {
            "target_count": target_count,
            "weight_factor": 2,
            "share_factor": 0.6,
        }

    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, application/geo+json",
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(endpoint_url, json=body, headers=headers)
        if r.status_code != 200 and "alternative_routes" in body:
            body_fallback = dict(body)
            body_fallback.pop("alternative_routes", None)
            r = await client.post(endpoint_url, json=body_fallback, headers=headers)

        if r.status_code in (400, 404, 500):
            text_lower = r.text.lower()
            if any(term in text_lower for term in (
                "could not find a route",
                "cannot find route",
                "no route found",
                "routable section",
                "2010",
                "2004",
                "avoid areas",
                "configuration limits",
            )):
                raise RouteBlockedException(f"Route blocked or severed by hazard avoidance polygons: {r.text[:200]}")

        if r.status_code in (400, 401, 403):
            raise RuntimeError(f"ORS rejected request ({r.status_code}): {r.text[:200]}")
        if r.status_code != 200:
            raise RuntimeError(f"ORS error {r.status_code}: {r.text[:200]}")
        data = r.json()

        features = data.get("features", [])
        if not features:
            raise RuntimeError("ORS returned no routes for the given coordinates.")

        routes = []
        for i, f in enumerate(features):
            props = f.get("properties", {})
            summary = props.get("summary", {})
            geom = f.get("geometry", {})
            coords = geom.get("coordinates", [])

            routes.append({
                "route_id": f"ors-{i}",
                "points": coords,
                "distance_km": round(summary.get("distance", 0) / 1000.0, 1),
                "duration_min": round(summary.get("duration", 0) / 60.0, 1),
            })

        if alternates > 0 and len(routes) == 1:
            try:
                alt = await _fetch_corridor_detour_route(
                    client, endpoint_url, headers, start, end, routes[0]["points"]
                )
                if alt:
                    routes.append(alt)
            except Exception:
                pass

    return routes
