"""Per-point landslide evaluation and segment-level aggregation.

Queries LHASA nowcast and static susceptibility at each sampled route coordinate,
combines with SACHET alert containment and rainfall data, then aggregates into
5 km segments using weakest-link independence.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.settings import settings
from app.modules.landslide.lhasa_client import get_lhasa_multi_layer

logger = logging.getLogger(__name__)

SEISMIC_FLOOR = settings.landslide.seismic_floor


def point_in_polygon(x: float, y: float, poly: List[Tuple[float, float]]) -> bool:
    """Ray-casting algorithm to test if point (x, y) is inside polygon vertices."""
    n = len(poly)
    if n < 3:
        return False
    inside = False
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def parse_wkt_polygon_coords(wkt: str) -> List[Tuple[float, float]]:
    """Extract (lon, lat) vertex list from standard WKT POLYGON string."""
    import re
    match = re.search(r"POLYGON\s*\(\((.*?)\)\)", str(wkt), re.IGNORECASE)
    if not match:
        return []
    coord_str = match.group(1).strip()
    coords: List[Tuple[float, float]] = []
    for pair in coord_str.split(","):
        parts = pair.strip().split()
        if len(parts) >= 2:
            try:
                coords.append((float(parts[0]), float(parts[1])))
            except ValueError:
                continue
    return coords


def _check_point_in_alerts(
    lon: float,
    lat: float,
    sachet_alerts: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Check if coordinate falls inside any active SACHET alert polygon via exact ray-casting."""
    for alert in sachet_alerts:
        geom = alert.get("geom") or alert.get("polygon_wkt")
        if not geom:
            continue
        poly_coords = parse_wkt_polygon_coords(geom)
        if poly_coords and point_in_polygon(lon, lat, poly_coords):
            return alert
    return None


_SEVERITY_MULTIPLIER = {
    "Extreme": 1.0,
    "Severe": 0.9,
    "Moderate": 0.6,
    "Minor": 0.3,
    "Unknown": 0.5,
}


def _compute_point_probability(
    lhasa_hazard: Optional[float],
    lhasa_susceptibility: Optional[float],
    rainfall_24h_mm: Optional[float],
    alert_hit: Optional[Dict[str, Any]],
    is_mountain: bool = True,
) -> Dict[str, Any]:
    """Compute per-point landslide closure probability from combined physical signals.

    Priority hierarchy:
    1. Active SACHET emergency alert containment -> severity-based override
    2. LHASA active hazard nowcast probability (P from XGBoost model)
    3. Static susceptibility combined with rainfall triggering factor
    4. Geotechnical/seismic floor (P_base = 0.02) in mountain/slope terrain
    5. Flat plains without susceptibility or active hazard -> 0.0 (landslide impossible)
    """
    if alert_hit is not None:
        severity = alert_hit.get("severity", "Unknown")
        p = _SEVERITY_MULTIPLIER.get(severity, 0.5)
        return {"p": round(min(1.0, p), 4), "source": "sachet_alert"}

    if lhasa_hazard is not None and lhasa_hazard > 0.0:
        return {"p": round(min(1.0, max(SEISMIC_FLOOR, lhasa_hazard)), 4), "source": "lhasa_hazard"}

    has_susceptibility = lhasa_susceptibility is not None and lhasa_susceptibility > 0.0
    if has_susceptibility:
        susc = float(lhasa_susceptibility) / 5.0
        if rainfall_24h_mm is not None:
            if rainfall_24h_mm >= settings.landslide.rainfall_trigger_extreme_mm:
                rain_factor = 1.0
            elif rainfall_24h_mm >= settings.landslide.rainfall_trigger_high_mm:
                rain_factor = 0.7
            elif rainfall_24h_mm >= settings.landslide.rainfall_trigger_watch_mm:
                rain_factor = 0.4
            else:
                rain_factor = 0.0
            p = max(SEISMIC_FLOOR, susc * rain_factor)
            return {"p": round(min(1.0, p), 4), "source": "susceptibility_rainfall"}
        else:
            p = max(SEISMIC_FLOOR, susc * 0.10)
            return {"p": round(min(1.0, p), 4), "source": "susceptibility_only"}

    # Verified plains (susceptibility == 0.0) or non-mountain: landslide is physically impossible -> 0.0
    if lhasa_susceptibility == 0.0 or not is_mountain:
        return {"p": 0.0, "source": "plains_zero"}

    # Mountain terrain with missing sensor data retains background seismic floor
    return {"p": SEISMIC_FLOOR, "source": "seismic_floor"}


def _aggregate_segments(
    points: List[Dict[str, Any]],
    segment_length_km: float = 5.0,
) -> Tuple[List[Dict[str, Any]], float]:
    """Aggregate per-point probabilities into fixed-length segments using Extreme Value Theory.

    Instead of naive independent Bernoulli trials (which falsely inflates risk to 100% as
    sampling density increases), this uses the block-maximum method:
    - Intra-segment: within a 5 km spatial correlation length, segment failure probability
      is governed by the peak hazard: P_segment = max(p_i)
    - Inter-segment: distinct 5 km segments with non-zero hazard combine via weakest-link
      survival: P_route = 1 - prod_{s: P_s > 0}(1 - P_s).
    - Trailing points (< 1 km) are merged into the final segment to prevent zero-length dummy segments.

    Returns:
        (segments, p_route)
    """
    if not points:
        return [], 0.0

    total_km = points[-1].get("km", 0.0)
    segments: List[Dict[str, Any]] = []
    current_seg_km_start = points[0].get("km", 0.0)
    current_seg_probs: List[float] = []

    for pt in points:
        km = pt.get("km", 0.0)
        p = pt.get("p", 0.0)

        if km - current_seg_km_start >= segment_length_km and current_seg_probs:
            remaining_km = total_km - km
            if remaining_km < 1.0:
                current_seg_probs.append(p)
                continue

            seg_p = max(current_seg_probs)
            segments.append({
                "km_start": round(current_seg_km_start, 1),
                "km_end": round(km, 1),
                "p_segment": round(min(1.0, seg_p), 4),
                "n_points": len(current_seg_probs),
            })
            current_seg_km_start = km
            current_seg_probs = [p]
        else:
            current_seg_probs.append(p)

    if current_seg_probs:
        seg_p = max(current_seg_probs)
        segments.append({
            "km_start": round(current_seg_km_start, 1),
            "km_end": round(total_km, 1),
            "p_segment": round(min(1.0, seg_p), 4),
            "n_points": len(current_seg_probs),
        })

    active_seg_probs = [s["p_segment"] for s in segments if s["p_segment"] > 0.0]
    if active_seg_probs:
        import functools
        p_route = 1.0 - functools.reduce(
            lambda a, b: a * b,
            [(1.0 - x) for x in active_seg_probs],
            1.0,
        )
    else:
        p_route = 0.0

    return segments, round(min(1.0, p_route), 4)



async def evaluate_route_landslide(
    sampled_coords: List[Tuple[float, float]],
    kms: List[float],
    sachet_alerts: Optional[List[Dict[str, Any]]] = None,
    rainfall_per_point: Optional[List[Optional[float]]] = None,
) -> Dict[str, Any]:
    """Evaluate landslide hazard at each sampled route coordinate using LHASA.

    Args:
        sampled_coords: (lon, lat) tuples aligned with route sample points.
        kms: Cumulative km for each sampled coordinate.
        sachet_alerts: Active SACHET alert dicts with geom field.
        rainfall_per_point: Optional 24h rainfall in mm per point.

    Returns:
        {
            "per_point": [{km, lon, lat, p, source, in_alert}],
            "segments": [{km_start, km_end, p_segment, n_points}],
            "p_landslide": float,
            "n_lhasa_hits": int,
            "n_alert_hits": int,
            "status": "ok" | "degraded" | "error",
        }
    """
    n = len(sampled_coords)
    if n == 0:
        return {
            "per_point": [],
            "segments": [],
            "p_landslide": 0.0,
            "n_lhasa_hits": 0,
            "n_alert_hits": 0,
            "status": "ok",
        }

    sachet_alerts = sachet_alerts or []

    try:
        multi = await get_lhasa_multi_layer(sampled_coords, timeout=settings.landslide.lhasa_timeout)
        hazard_vals = multi["hazard"]
        susc_vals = multi["susceptibility"]
        status = "ok"
    except Exception as e:
        logger.warning("LHASA multi-layer query failed, degrading: %s", e)
        hazard_vals = [None] * n
        susc_vals = [None] * n
        status = "degraded"

    n_lhasa_hits = sum(1 for v in hazard_vals if v is not None)
    n_alert_hits = 0

    per_point = []
    for i, (lon, lat) in enumerate(sampled_coords):
        km = kms[i] if i < len(kms) else 0.0
        rain = rainfall_per_point[i] if rainfall_per_point and i < len(rainfall_per_point) else None

        alert_hit = _check_point_in_alerts(lon, lat, sachet_alerts)
        if alert_hit is not None:
            n_alert_hits += 1

        result = _compute_point_probability(
            lhasa_hazard=hazard_vals[i] if i < len(hazard_vals) else None,
            lhasa_susceptibility=susc_vals[i] if i < len(susc_vals) else None,
            rainfall_24h_mm=rain,
            alert_hit=alert_hit,
        )

        per_point.append({
            "km": round(km, 1),
            "lon": round(lon, 6),
            "lat": round(lat, 6),
            "p": result["p"],
            "source": result["source"],
            "in_alert": alert_hit is not None,
        })

    segments, p_route = _aggregate_segments(per_point, settings.landslide.segment_length_km)

    return {
        "per_point": per_point,
        "segments": segments,
        "p_landslide": p_route,
        "n_lhasa_hits": n_lhasa_hits,
        "n_alert_hits": n_alert_hits,
        "status": status,
    }
