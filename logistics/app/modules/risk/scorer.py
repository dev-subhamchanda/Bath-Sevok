"""Spatiotemporal route evaluation across river crossings, gauge buffers, and road segments.

Orchestrates route kinematics, spatial feature matching, point hydraulic vulnerability,
logistics manifest tracking, and safe dispatch window forecasting.
"""

from __future__ import annotations

import math
from typing import List, Dict, Any, Optional, Tuple
from app.enums import RiskLevel, Verdict, RISK_RANK, verdict_from_risk, normalize_vehicle_profile
from app.settings import settings
from app.modules.risk.geo import haversine_km, sample_coordinates, sample_coordinates_adaptive
from app.modules.risk.hydraulics import (
    calc_bankfull_excess,
    calc_bankfull_depth,
    calc_inundation_depth,
    calc_inversion_bounds,
    calc_inversion_q,
    calc_soaking_index,
    evaluate_vehicle_risk,
    calc_closure_risk,
    VEHICLE_HYDRAULIC_PROFILES,
)
from app.modules.weather.metrics import evaluate_weather, parse_weather_grid


TERRAIN_SPEED_BOUNDS: Dict[str, Tuple[float, float]] = {
    "plain": (45.0, 60.0),
    "rolling": (30.0, 45.0),
    "mountain_ghat": (15.0, 25.0),
}

TERRAIN_SPEED_KMH: Dict[str, float] = {
    "plain": 50.0,
    "rolling": 36.0,
    "mountain_ghat": 20.0,
}


def identify_corridor(
    sampled_coords: List[Tuple[float, float]],
    corridor_points: Optional[List[Dict[str, Any]]] = None,
    corridors: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    """Identify which registered freight corridor is traversed by the route polyline."""
    if not corridor_points or not corridors or not sampled_coords:
        return None

    corr_map = {c["corridor_id"]: c for c in corridors}
    hits_by_corr: Dict[int, int] = {}

    for cp in corridor_points:
        cid = cp.get("corridor_id")
        cp_lon = cp.get("lon")
        cp_lat = cp.get("lat")
        if cid is None or cp_lon is None or cp_lat is None:
            continue
        if any(haversine_km(lon, lat, cp_lon, cp_lat) <= 25.0 for lon, lat in sampled_coords):
            hits_by_corr[cid] = hits_by_corr.get(cid, 0) + 1

    if not hits_by_corr:
        return None

    best_cid = max(hits_by_corr, key=hits_by_corr.get)
    best_corr = corr_map.get(best_cid)
    if best_corr:
        terrain = best_corr.get("terrain_class", "plain")
        speed = best_corr.get("speed_kmh") or TERRAIN_SPEED_KMH.get(terrain, 50.0)
        return {
            "corridor_id": best_corr["corridor_id"],
            "name": best_corr["name"],
            "highways": best_corr["highways"],
            "has_reroute": best_corr["has_reroute"],
            "terrain_class": terrain,
            "speed_kmh": speed,
            "matched_points": hits_by_corr[best_cid],
        }
    return None


def check_linear_hazard(
    lon: float,
    lat: float,
    linear_hazards: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    """Match coordinate against registered linear hazard corridor bounding boxes."""
    if not linear_hazards:
        return None
    for h in linear_hazards:
        lon_min = h.get("lon_min", -180.0)
        lon_max = h.get("lon_max", 180.0)
        lat_min = h.get("lat_min", -90.0)
        lat_max = h.get("lat_max", 90.0)
        if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
            return h
    return None


_CACHED_LINEAR_HAZARDS: Optional[List[Dict[str, Any]]] = None


def get_cached_linear_hazards() -> List[Dict[str, Any]]:
    """Retrieve and cache linear hazards from DuckDB."""
    global _CACHED_LINEAR_HAZARDS
    if _CACHED_LINEAR_HAZARDS is not None:
        return _CACHED_LINEAR_HAZARDS
    try:
        import duckdb
        from pathlib import Path
        db_path = Path(settings.server.db_path)
        if not db_path.exists():
            db_path = Path(__file__).resolve().parents[3] / "data" / "ne_india.duckdb"
        if db_path.exists():
            con = duckdb.connect(str(db_path), read_only=True)
            hazards = con.execute(
                "SELECT hazard_id, name, river, kind, lon_min, lon_max, lat_min, lat_max, "
                "clearance_m, clearance_class, notes, status FROM linear_hazards"
            ).fetchall()
            cols = [
                "hazard_id", "name", "river", "kind", "lon_min", "lon_max",
                "lat_min", "lat_max", "clearance_m", "clearance_class", "notes", "status"
            ]
            _CACHED_LINEAR_HAZARDS = [dict(zip(cols, r)) for r in hazards]
            con.close()
            return _CACHED_LINEAR_HAZARDS
    except Exception:
        pass
    _CACHED_LINEAR_HAZARDS = []
    return _CACHED_LINEAR_HAZARDS


def check_linear_corridor(
    lon: float,
    lat: float,
    linear_hazards: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    """Lookup linear hazard corridor using provided list or cached DuckDB rows."""
    if linear_hazards is not None:
        return check_linear_hazard(lon, lat, linear_hazards)
    return check_linear_hazard(lon, lat, get_cached_linear_hazards())


_CACHED_WEATHER_GRID: Optional[List[Dict[str, Any]]] = None


def get_cached_weather_grid_data(db_con: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Retrieve and cache active weather forecast grid from DuckDB."""
    global _CACHED_WEATHER_GRID
    if _CACHED_WEATHER_GRID is not None:
        return _CACHED_WEATHER_GRID
    try:
        from app.db.queries import get_cached_weather_grid
        if db_con is not None:
            raw = get_cached_weather_grid(db_con)
            _CACHED_WEATHER_GRID = parse_weather_grid(raw)
            return _CACHED_WEATHER_GRID
        from app.db.connection import read_cursor
        with read_cursor() as con:
            raw = get_cached_weather_grid(con)
            _CACHED_WEATHER_GRID = parse_weather_grid(raw)
            return _CACHED_WEATHER_GRID
    except Exception:
        pass
    _CACHED_WEATHER_GRID = []
    return _CACHED_WEATHER_GRID


def compute_transit_time_hours(
    distance_km: float,
    terrain_class: str = "plain",
    nominal_speed_kmh: Optional[float] = None,
) -> Dict[str, float]:
    """Compute transit time interval [t_min, t_max] and nominal duration from terrain speed bounds."""
    v_min, v_max = TERRAIN_SPEED_BOUNDS.get(terrain_class, (30.0, 50.0))
    t_min = distance_km / max(1.0, v_max)
    t_max = distance_km / max(1.0, v_min)
    if nominal_speed_kmh is not None and nominal_speed_kmh > 0:
        v_nominal = max(v_min, min(v_max, nominal_speed_kmh))
    else:
        v_nominal = TERRAIN_SPEED_KMH.get(terrain_class, 40.0)
    t_nominal = distance_km / max(1.0, v_nominal)
    return {
        "t_min_hours": round(t_min, 2),
        "t_max_hours": round(t_max, 2),
        "t_nominal_hours": round(t_nominal, 2),
        "driving_hours": round(t_nominal, 2),
        "elapsed_hours": round(t_nominal, 2),
        "v_min_kmh": v_min,
        "v_max_kmh": v_max,
        "speed_kmh": v_nominal,
    }


def find_safe_staging_node(
    first_blocker_km: float,
    coords_with_km: List[Tuple[float, float, float]],
    corridor_points: Optional[List[Dict[str, Any]]],
    matched_corridor_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """Snap safe staging location to nearest upstream registered logistics depot."""
    if not corridor_points or first_blocker_km <= 0.0:
        return None

    candidates = []
    for cp in corridor_points:
        cp_lon = cp.get("lon")
        cp_lat = cp.get("lat")
        if cp_lon is None or cp_lat is None:
            continue

        best_d = 9999.0
        best_km = 0.0
        for lon, lat, km in coords_with_km:
            d = haversine_km(lon, lat, cp_lon, cp_lat)
            if d < best_d:
                best_d = d
                best_km = km

        if best_d <= 35.0 and best_km <= first_blocker_km + 1e-3:
            candidates.append({
                "name": cp.get("point_name", "Unknown Depot"),
                "km": round(best_km, 1),
                "role": cp.get("role", "depot"),
                "dist_to_route_km": round(best_d, 1),
            })

    if not candidates:
        return None

    best_candidate = max(candidates, key=lambda c: c["km"])
    return {
        "name": best_candidate["name"],
        "km": best_candidate["km"],
        "role": best_candidate["role"],
    }


def compute_dispatch_window(
    points: List[List[float]],
    departure_day: int,
    gauges_by_day: Dict[int, List[Dict[str, Any]]],
    crossings: List[Dict[str, Any]],
    segments: List[Dict[str, Any]],
    ways: List[Dict[str, Any]],
    vehicle_profile: str = "heavy_multi_axle",
    max_samples: int = 40,
    blocking_gauges: Optional[List[Dict[str, Any]]] = None,
    corridors: Optional[List[Dict[str, Any]]] = None,
    corridor_points: Optional[List[Dict[str, Any]]] = None,
    terrain_class: Optional[str] = None,
    linear_hazards: Optional[List[Dict[str, Any]]] = None,
    allow_uncalibrated: bool = True,
    nominal_duration_min: Optional[float] = None,
) -> Dict[str, Any]:
    """Find earliest upcoming forecast day when hydrographs recede below closure threshold."""
    is_receding = False
    if blocking_gauges:
        is_receding = any(g.get("trend") == "FALLING" for g in blocking_gauges)

    for cand_day in range(departure_day + 1, 7):
        cand_scored = score_route_geometry(
            points=points,
            day=cand_day,
            gauges=gauges_by_day.get(cand_day, []),
            crossings=crossings,
            segments=segments,
            ways=ways,
            max_samples=max_samples,
            departure_day=cand_day,
            gauges_by_day=gauges_by_day,
            vehicle_profile=vehicle_profile,
            check_dispatch_window=False,
            corridors=corridors,
            corridor_points=corridor_points,
            terrain_class=terrain_class,
            linear_hazards=linear_hazards,
            allow_uncalibrated=allow_uncalibrated,
            nominal_duration_min=nominal_duration_min,
        )
        if cand_scored["is_passable"]:
            wait_hours = (cand_day - departure_day) * 24.0
            return {
                "is_receding": is_receding or True,
                "safe_departure_day": cand_day,
                "estimated_wait_hours": wait_hours,
                "projected_verdict": cand_scored["verdict"],
                "message": f"Safe dispatch window opens on Day {cand_day} (~{int(wait_hours)}h wait) as floodwaters recede.",
            }

    return {
        "is_receding": is_receding,
        "safe_departure_day": None,
        "estimated_wait_hours": None,
        "projected_verdict": None,
        "message": "Hydrograph remains above vehicle safety threshold across entire 7-day forecast horizon.",
    }


def evaluate_point_hydrology(
    gauge: Dict[str, Any],
    clearance_m: float,
    terrain_class: str,
    vehicle_profile: str,
    multi_day_q: List[float],
    eval_day: int,
    allow_uncalibrated: bool = True,
    override_threshold_q: Optional[float] = None,
) -> Dict[str, Any]:
    """Evaluate point-level hydraulic metrics, vehicle risk, soaking index, and closure likelihood."""
    q_mean = gauge["q_mean"]
    q_p50 = gauge["q_p50"]
    q_p90 = gauge["q_p90"]
    rp2 = gauge.get("rp2", 0.0) or 0.0
    rp5 = gauge.get("rp5", 0.0) or 0.0
    load_ratio = gauge.get("load_ratio", 0.0) or (round(q_mean / rp5, 3) if rp5 > 0 else 0.0)
    p_rp2 = gauge.get("p_rp2", 0.0) or 0.0
    p_rp5 = gauge.get("p_rp5", 0.0) or 0.0

    bankfull_excess = calc_bankfull_excess(q_mean, rp2, rp5)
    inundation_depth_m = calc_inundation_depth(q_mean, rp2, rp5, clearance_m=clearance_m)

    effective_risk, eval_reason = evaluate_vehicle_risk(
        excess=bankfull_excess,
        load_ratio=load_ratio,
        vehicle_profile=vehicle_profile,
        p_rp5=p_rp5,
        p_rp2=p_rp2,
        base_risk=gauge.get("risk", RiskLevel.OK.value),
        depth_m=inundation_depth_m,
        clearance_m=clearance_m,
        allow_uncalibrated=allow_uncalibrated,
    )

    q_inversion, q_min_bound, q_max_bound = calc_inversion_bounds(
        rp2=rp2,
        rp5=rp5,
        terrain_class=terrain_class,
        clearance_m=clearance_m,
        vehicle_profile=vehicle_profile,
    )
    effective_threshold_q = override_threshold_q if override_threshold_q is not None else q_inversion

    spread = max(0.0, q_p90 - q_p50)
    likelihood_assessment = calc_closure_risk(
        q_mean=q_mean,
        q_threshold=effective_threshold_q,
        spread=spread,
        rp2=rp2,
        rp5=rp5,
        terrain_class=terrain_class,
        clearance_m=clearance_m,
        vehicle_profile=vehicle_profile,
    )
    closure_lik = likelihood_assessment["closure_likelihood"]

    soak_s, soak_crit, is_soaked = calc_soaking_index(
        multi_day_q=multi_day_q,
        rp2=rp2,
        rp5=rp5,
        eval_day=eval_day,
        terrain_class=terrain_class,
    )

    # Tri-State Physical Support Classification
    support_state = "STATE_1_CLEAR"
    if q_mean >= rp2 and is_soaked and clearance_m < 2.0:
        effective_risk = RiskLevel.HIGH.value
        support_state = "STATE_3_HOLD"
        eval_reason = (
            f"Embankment saturation failure: cumulative soaking index S={soak_s:.2f} >= "
            f"Scrit={soak_crit:.2f} excess-days indicates subgrade collapse"
        )
        closure_lik = max(closure_lik, 1.0)
    elif not math.isinf(effective_threshold_q) and clearance_m < 2.0:
        if q_mean >= q_max_bound:
            support_state = "STATE_3_HOLD"
            if effective_risk != RiskLevel.HIGH.value:
                effective_risk = RiskLevel.HIGH.value
                eval_reason = (
                    f"Definitive hydraulic closure: Q={q_mean:.1f} >= Q_max={q_max_bound:.1f} "
                    f"({terrain_class} regime, {vehicle_profile})"
                )
        elif q_mean >= effective_threshold_q:
            support_state = "STATE_3_HOLD"
            if effective_risk != RiskLevel.HIGH.value:
                effective_risk = RiskLevel.HIGH.value
                eval_reason = (
                    f"Hydraulic threshold exceeded: Q={q_mean:.1f} >= Q_crit={effective_threshold_q:.1f} "
                    f"({terrain_class} regime, {vehicle_profile})"
                )
        elif q_mean >= q_min_bound:
            support_state = "STATE_2_AMBIGUOUS"
            if effective_risk == RiskLevel.OK.value:
                effective_risk = RiskLevel.WATCH.value
                eval_reason = (
                    f"Epistemic ambiguity zone: Q={q_mean:.1f} in support [{q_min_bound:.1f}, {q_max_bound:.1f}] "
                    f"({terrain_class} regime, closure_likelihood={closure_lik:.2f})"
                )
        else:
            support_state = "STATE_1_CLEAR"

    return {
        "risk": effective_risk,
        "reason": eval_reason,
        "bankfull_excess": round(bankfull_excess, 3),
        "inundation_depth_m": inundation_depth_m,
        "load_ratio": load_ratio,
        "p_rp2": p_rp2,
        "p_rp5": p_rp5,
        "p_rp10": gauge.get("p_rp10", 0.0) or 0.0,
        "q_mean": q_mean,
        "q_p50": q_p50,
        "q_p90": q_p90,
        "rp2": rp2,
        "rp5": rp5,
        "trend": gauge.get("trend", "STABLE"),
        "q_threshold": round(effective_threshold_q, 1) if not math.isinf(effective_threshold_q) else None,
        "q_threshold_support": [round(q_min_bound, 1), round(q_max_bound, 1)] if not math.isinf(q_min_bound) else [None, None],
        "support_state": support_state,
        "soaking_index": soak_s,
        "soaking_crit": soak_crit,
        "closure_likelihood": closure_lik,
    }


def score_route_geometry(
    points: List[List[float]],
    day: int = 2,
    gauges: List[Dict[str, Any]] | None = None,
    crossings: List[Dict[str, Any]] | None = None,
    segments: List[Dict[str, Any]] | None = None,
    ways: List[Dict[str, Any]] | None = None,
    max_samples: int = 40,
    departure_day: int = 0,
    gauges_by_day: Optional[Dict[int, List[Dict[str, Any]]]] = None,
    vehicle_profile: str = "heavy_multi_axle",
    check_dispatch_window: bool = True,
    corridors: Optional[List[Dict[str, Any]]] = None,
    corridor_points: Optional[List[Dict[str, Any]]] = None,
    terrain_class: Optional[str] = None,
    linear_hazards: Optional[List[Dict[str, Any]]] = None,
    allow_uncalibrated: bool = True,
    spatial_hazards: Optional[Dict[str, Any]] = None,
    db_con: Optional[Any] = None,
    landslide_eval: Optional[Dict[str, Any]] = None,
    nominal_duration_min: Optional[float] = None,
    weather_grid: Optional[List[Dict[str, Any]]] = None,
    departure_time: Optional[Any] = None,
) -> Dict[str, Any]:
    """Score an ORS GPS route polyline against physical river bottlenecks and spatial hazards."""
    vehicle_profile = normalize_vehicle_profile(vehicle_profile)
    gauges = gauges or []
    crossings = crossings or []
    segments = segments or []
    ways = ways or []

    if weather_grid is None:
        weather_grid = get_cached_weather_grid_data(db_con)

    # Default spatial hazards if not explicitly passed
    if spatial_hazards is None:
        if db_con is not None:
            try:
                from app.db.queries import get_spatial_route_hazards
                pt_tuples = [(p[0], p[1]) for p in points if len(p) >= 2]
                spatial_hazards = get_spatial_route_hazards(db_con, pt_tuples)
            except Exception:
                spatial_hazards = None
        if spatial_hazards is None:
            spatial_hazards = {
                "active_sachet_alerts": [],
                "total_blocked_km": 0.0,
                "has_active_roadblock": False,
                "intersected_mountain_corridors": [],
                "total_mountain_km": 0.0,
                "max_landslide_susceptibility": 0.0,
            }

    sampled_coords = sample_coordinates_adaptive(
        points=points,
        max_samples=max_samples,
        structures=crossings,
        snap_radius_km=settings.routing.crossing_buffer_km,
    )
    legs = []
    gauges_seen = set()
    segments_seen = set()

    seg_by_key = {s["segment"]: s for s in segments if "segment" in s}

    # 1. Identify corridor and operating speed
    matched_corridor = identify_corridor(sampled_coords, corridor_points, corridors)
    if terrain_class:
        effective_terrain = terrain_class
    elif matched_corridor and "terrain_class" in matched_corridor:
        effective_terrain = matched_corridor["terrain_class"]
    else:
        effective_terrain = "plain"

    v_min, v_max = TERRAIN_SPEED_BOUNDS.get(effective_terrain, (45.0, 60.0))
    if nominal_duration_min is not None and nominal_duration_min > 0:
        approx_total_km = 0.0
        for p1, p2 in zip(sampled_coords[:-1], sampled_coords[1:]):
            approx_total_km += haversine_km(p1[0], p1[1], p2[0], p2[1])
        base_speed = (approx_total_km / (nominal_duration_min / 60.0)) if approx_total_km > 0 else 40.0
        gamma_v = VEHICLE_HYDRAULIC_PROFILES.get(vehicle_profile, {}).get("gamma_v", 1.50)
        speed_kmh = max(v_min, min(v_max, base_speed / max(1.0, gamma_v)))
    else:
        speed_kmh = (
            matched_corridor.get("speed_kmh", TERRAIN_SPEED_KMH.get(effective_terrain, 50.0))
            if matched_corridor
            else TERRAIN_SPEED_KMH.get(effective_terrain, 50.0)
        )

    coords_with_km: List[Tuple[float, float, float]] = []
    cum_distance_km = 0.0
    prev_coord = None
    first_blocker = None
    last_safe_km = 0.0
    elapsed_hours = 0.0

    # 2. Iterate coordinate samples
    for lon, lat in sampled_coords:
        if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
            raise ValueError(f"Coordinate out of valid range: [{lon}, {lat}]")

        if prev_coord is not None:
            cum_distance_km += haversine_km(prev_coord[0], prev_coord[1], lon, lat)
        prev_coord = (lon, lat)
        coords_with_km.append((lon, lat, cum_distance_km))

        transit_times = compute_transit_time_hours(cum_distance_km, terrain_class=effective_terrain, nominal_speed_kmh=speed_kmh)
        t_min_hours = transit_times["t_min_hours"]
        t_max_hours = transit_times["t_max_hours"]
        elapsed_hours = transit_times["elapsed_hours"]

        if gauges_by_day:
            eval_day_min = min(6, departure_day + int(t_min_hours // 24))
            eval_day_max = min(6, departure_day + int(t_max_hours // 24))
            eval_day = min(6, departure_day + int(elapsed_hours // 24))
            active_gauges = gauges_by_day.get(eval_day, gauges)
        else:
            eval_day_min = day
            eval_day_max = day
            eval_day = day
            active_gauges = gauges

        # Spatial crossing / linear hazard match
        crossing_hit = None
        for xing in crossings:
            x_lon, x_lat = xing.get("lon"), xing.get("lat")
            if x_lon is not None and x_lat is not None:
                if haversine_km(lon, lat, x_lon, x_lat) <= settings.routing.crossing_buffer_km:
                    crossing_hit = xing
                    break

        if not crossing_hit:
            crossing_hit = check_linear_corridor(lon, lat, linear_hazards)

        crossing_clearance = 0.0
        crossing_c_class = "FLUSH_CAUSEWAY"
        if crossing_hit:
            if "clearance_m" in crossing_hit and crossing_hit["clearance_m"] is not None:
                crossing_clearance = float(crossing_hit["clearance_m"])
                crossing_c_class = crossing_hit.get("clearance_class", "STANDARD_EMBANKMENT")
            elif crossing_hit.get("kind") == "bridge":
                crossing_clearance, crossing_c_class = (0.30, "STANDARD_EMBANKMENT")
            else:
                crossing_clearance, crossing_c_class = (0.0, "FLUSH_CAUSEWAY")

        # Match river gauge within verified basin (enforcing 15.0 km hydrological reach cutoff)
        closest_gauge = None
        min_gauge_km = 9999.0

        if crossing_hit and crossing_hit.get("river"):
            xing_river = crossing_hit["river"].lower()
            same_river_gauges = [g for g in active_gauges if xing_river in g["river"].lower()]
            if same_river_gauges:
                closest_gauge = min(
                    same_river_gauges,
                    key=lambda g: haversine_km(lon, lat, g["cell_lon"], g["cell_lat"]),
                )
                min_gauge_km = haversine_km(lon, lat, closest_gauge["cell_lon"], closest_gauge["cell_lat"])
                # For discrete point crossings (bridges), gauge must be within 15.0 km reach.
                # For registered linear floodplain corridors (e.g. Kaziranga), points inside the
                # corridor bounding box are monitored by the corridor reach gauge.
                is_linear_corridor = crossing_hit.get("kind") == "linear_corridor" or "lon_min" in crossing_hit
                if not is_linear_corridor and min_gauge_km > 15.0:
                    closest_gauge = None
                    min_gauge_km = 9999.0
            else:
                min_gauge_km = 9999.0
                closest_gauge = None
        else:
            for g in active_gauges:
                dist = haversine_km(lon, lat, g["cell_lon"], g["cell_lat"])
                if dist < min_gauge_km:
                    min_gauge_km = dist
                    closest_gauge = g
            max_cutoff = min(15.0, settings.routing.max_gauge_distance_km) if settings.routing.max_gauge_distance_km > 0 else 15.0
            if min_gauge_km > max_cutoff:
                closest_gauge = None
                min_gauge_km = 9999.0


        # Match OSM road segment
        seg_hit = None
        for w in ways:
            if (w["lon_min"] - 0.02 <= lon <= w["lon_max"] + 0.02 and
                w["lat_min"] - 0.02 <= lat <= w["lat_max"] + 0.02):
                key = f"{w['aoi']}:{w['ref'] or w['name'] or 'unnamed'}"
                if key in seg_by_key:
                    seg_hit = seg_by_key[key]
                    segments_seen.add(seg_hit["segment"])
                    break

        lead_time_hours = None
        if closest_gauge is not None:
            g_name = closest_gauge["gauge"]

            r_name = closest_gauge["river"]
            gauges_seen.add(g_name)

            multi_day_q = []
            if gauges_by_day:
                for d_idx in range(eval_day + 1):
                    d_gauges = gauges_by_day.get(d_idx, [])
                    mg = next((g for g in d_gauges if g.get("gauge") == g_name), None)
                    multi_day_q.append(mg["q_mean"] if mg else closest_gauge["q_mean"])
            else:
                multi_day_q.append(closest_gauge["q_mean"])

            seg_threshold = seg_hit.get("threshold_q") if (seg_hit and seg_hit.get("threshold_q") is not None) else None
            point_eval = evaluate_point_hydrology(
                gauge=closest_gauge,
                clearance_m=crossing_clearance,
                terrain_class=effective_terrain,
                vehicle_profile=vehicle_profile,
                multi_day_q=multi_day_q,
                eval_day=eval_day,
                allow_uncalibrated=allow_uncalibrated,
                override_threshold_q=seg_threshold,
            )

            # Multi-day arrival window check
            if gauges_by_day and eval_day_min < eval_day_max and point_eval["risk"] != RiskLevel.HIGH.value:
                for cand_day in range(eval_day_min, eval_day_max + 1):
                    if cand_day == eval_day:
                        continue
                    cand_active = gauges_by_day.get(cand_day, [])
                    cand_gauge = next((g for g in cand_active if g.get("gauge") == g_name), None)
                    if cand_gauge:
                        cand_eval = evaluate_point_hydrology(
                            gauge=cand_gauge,
                            clearance_m=crossing_clearance,
                            terrain_class=effective_terrain,
                            vehicle_profile=vehicle_profile,
                            multi_day_q=[cand_gauge["q_mean"]],
                            eval_day=0,
                            allow_uncalibrated=allow_uncalibrated,
                        )
                        if cand_eval["risk"] == RiskLevel.HIGH.value:
                            point_eval["risk"] = RiskLevel.WATCH.value
                            if cand_day > eval_day:
                                lead_time_hours = round(max(0.0, (cand_day - departure_day) * 24.0 - elapsed_hours), 1)
                                point_eval["reason"] = (
                                    f"Rising flood hazard: arrival window [Day {eval_day_min}..{eval_day_max}] "
                                    f"intersects Day {cand_day} flood breach (lead time ~{lead_time_hours}h, P(RP5)={cand_gauge.get('p_rp5', 0.0):.2f})"
                                )
                            else:
                                point_eval["reason"] = (
                                    f"Preceding flood hazard: arrival window [Day {eval_day_min}..{eval_day_max}] "
                                    f"intersects un-receded Day {cand_day} flood breach (P(RP5)={cand_gauge.get('p_rp5', 0.0):.2f})"
                                )
                            break
        else:
            g_name = crossing_hit["name"] if crossing_hit else "mountain_terrain"
            r_name = crossing_hit["river"] if crossing_hit else "none"
            point_eval = {
                "risk": RiskLevel.OK.value,
                "reason": "Ungauged / clear terrain",
                "bankfull_excess": 0.0,
                "inundation_depth_m": 0.0,
                "load_ratio": 0.0,
                "p_rp2": 0.0,
                "p_rp5": 0.0,
                "p_rp10": 0.0,
                "q_mean": 0.0,
                "q_p50": 0.0,
                "q_p90": 0.0,
                "rp2": 0.0,
                "rp5": 0.0,
                "trend": "STABLE",
                "q_threshold": None,
                "q_threshold_support": [None, None],
                "support_state": "STATE_1_CLEAR",
                "soaking_index": 0.0,
                "soaking_crit": 2.0,
                "closure_likelihood": 0.0,
            }

        leg_data = {
            "lon": lon,
            "lat": lat,
            "km_from_start": round(cum_distance_km, 1),
            "eval_day": eval_day,
            "eval_day_min": eval_day_min,
            "eval_day_max": eval_day_max,
            "t_min_hours": round(t_min_hours, 2),
            "t_max_hours": round(t_max_hours, 2),
            "elapsed_hours": round(elapsed_hours, 1),
            "gauge": g_name,
            "river": r_name,
            "gauge_km": round(min_gauge_km, 1) if min_gauge_km < 9000 else -1.0,
            "crossing": crossing_hit["name"] if crossing_hit else None,
            "clearance_m": crossing_clearance,
            "clearance_class": crossing_c_class,
            "lead_time_hours": lead_time_hours,
            "q_mean": point_eval["q_mean"],
            "q_p50": point_eval["q_p50"],
            "q_p90": point_eval["q_p90"],
            "rp2": point_eval["rp2"],
            "rp5": point_eval["rp5"],
            "load_ratio": point_eval["load_ratio"],
            "bankfull_excess": point_eval["bankfull_excess"],
            "inundation_depth_m": point_eval["inundation_depth_m"],
            "depth_is_advisory": True,
            "p_rp2": point_eval["p_rp2"],
            "p_rp5": point_eval["p_rp5"],
            "p_rp10": point_eval["p_rp10"],
            "risk_probability": round(max(point_eval["p_rp2"], point_eval["p_rp5"]), 3),
            "trend": point_eval["trend"],
            "risk": point_eval["risk"],
            "reason": point_eval["reason"],
            "calibration_status": "UNCALIBRATED" if allow_uncalibrated else "CALIBRATED_HYDROLOGY",
            "segment": seg_hit["segment"] if seg_hit else None,
            "segment_threshold_q": point_eval["q_threshold"],
            "q_threshold": point_eval["q_threshold"],
            "q_threshold_support": point_eval["q_threshold_support"],
            "support_state": point_eval["support_state"],
            "soaking_index": point_eval["soaking_index"],
            "soaking_crit": point_eval["soaking_crit"],
            "closure_likelihood": point_eval["closure_likelihood"],
        }
        legs.append(leg_data)

        # Logistics first blocker tracking
        if RISK_RANK.get(point_eval["risk"], 0) >= RISK_RANK["HIGH"]:
            if first_blocker is None:
                first_blocker = {
                    "km": round(cum_distance_km, 1),
                    "location": leg_data["crossing"] or leg_data["segment"] or leg_data["gauge"],
                    "river": leg_data["river"],
                    "risk": point_eval["risk"],
                    "vehicle_profile": vehicle_profile,
                    "load_ratio": point_eval["load_ratio"],
                    "bankfull_excess": point_eval["bankfull_excess"],
                    "inundation_depth_m": point_eval["inundation_depth_m"],
                    "clearance_m": crossing_clearance,
                    "reason": point_eval["reason"],
                    "q_threshold": point_eval["q_threshold"],
                    "q_threshold_support": point_eval["q_threshold_support"],
                    "support_state": point_eval["support_state"],
                    "soaking_index": point_eval["soaking_index"],
                    "closure_likelihood": point_eval["closure_likelihood"],
                }
        elif first_blocker is None:
            last_safe_km = cum_distance_km

    # Spatiotemporal weather arrival profile
    weather_summary = evaluate_weather(legs, weather_grid, departure_time)

    # Pluvial cloudburst check on causeways / low-clearance sections (>= 35 mm/h)
    for leg in legs:
        if leg.get("precipitation_mm_h", 0.0) >= 35.0:
            c_m = leg.get("clearance_m", 1.5)
            if c_m < 0.5:
                if RISK_RANK.get(leg["risk"], 0) < RISK_RANK["HIGH"]:
                    leg["risk"] = RiskLevel.HIGH.value
                    leg["reason"] = (
                        f"Torrential cloudburst ({leg['precipitation_mm_h']:.1f} mm/h): "
                        f"pluvial sheet flow submerges low-clearance crossing"
                    )
                    leg["closure_likelihood"] = max(leg.get("closure_likelihood", 0.0), 0.85)
                    if first_blocker is None:
                        first_blocker = {
                            "km": leg["km_from_start"],
                            "location": leg["crossing"] or leg["segment"] or leg["gauge"],
                            "river": leg["river"],
                            "risk": leg["risk"],
                            "vehicle_profile": vehicle_profile,
                            "load_ratio": leg["load_ratio"],
                            "bankfull_excess": leg["bankfull_excess"],
                            "inundation_depth_m": leg["inundation_depth_m"],
                            "clearance_m": c_m,
                            "reason": leg["reason"],
                            "q_threshold": leg["q_threshold"],
                            "q_threshold_support": leg["q_threshold_support"],
                            "support_state": leg["support_state"],
                            "soaking_index": leg["soaking_index"],
                            "closure_likelihood": leg["closure_likelihood"],
                        }

    worst = max(legs, key=lambda leg: RISK_RANK.get(leg["risk"], 0))
    verdict = verdict_from_risk(worst["risk"])
    is_passable = verdict != Verdict.HOLD.value

    # Multi-hazard fusion
    # 1. Fluvial flood probability
    closure_liks = [leg.get("closure_likelihood", 0.0) for leg in legs]
    if closure_liks:
        p_flood = min(1.0, max(closure_liks) + 0.10 * (sum(closure_liks) / len(closure_liks)))
    else:
        p_flood = 0.0

    # 2. Landslide susceptibility and slope-failure probability
    # Prefer per-point LHASA evaluation when available; fall back to corridor-based heuristic
    if landslide_eval and landslide_eval.get("p_landslide") is not None:
        p_landslide = landslide_eval["p_landslide"]
        landslide_segments = landslide_eval.get("segments", [])
        landslide_status = landslide_eval.get("status", "ok")
    else:
        s_max = spatial_hazards.get("max_landslide_susceptibility", 0.0) if spatial_hazards else 0.0
        p_rp5_max = max((leg.get("p_rp5", 0.0) for leg in legs), default=0.0)
        r24_max = max((leg.get("rain_24h", 0.0) for leg in legs), default=0.0)
        r72_max = max((leg.get("rain_3d", 0.0) for leg in legs), default=0.0)

        active_sachet_alerts = spatial_hazards.get("active_sachet_alerts", []) if spatial_hazards else []
        has_landslide_alert = any(
            "landslide" in (a.get("event") or "").lower() or
            "landslide" in (a.get("headline") or "").lower() or
            "rockfall" in (a.get("headline") or "").lower()
            for a in active_sachet_alerts
        )

        if s_max > 0.0:
            if has_landslide_alert:
                landslide_trigger = 1.0
            else:
                rain_trigger = min(1.0, (r24_max / 100.0) + (r72_max / 200.0))
                landslide_trigger = min(1.0, max(0.02 + p_rp5_max, rain_trigger))
            p_landslide = round(min(1.0, s_max * landslide_trigger), 3)
        else:
            p_landslide = 0.0
        landslide_segments = []
        landslide_status = "legacy_heuristic"

    # Active landslide / rockfall alerts from SACHET (used for alert warnings regardless of LHASA)
    active_sachet_alerts = spatial_hazards.get("active_sachet_alerts", []) if spatial_hazards else []

    # 3. Active roadblock probability from SACHET alerts and dynamic hazards
    has_roadblock = spatial_hazards.get("has_active_roadblock", False) if spatial_hazards else False
    if has_roadblock:
        p_roadblock = 1.0
        verdict = Verdict.HOLD.value
        is_passable = False
        if first_blocker is None:
            active_dyn = spatial_hazards.get("active_dynamic_hazards", []) if spatial_hazards else []
            block_km = 0.0
            block_desc = "Active Roadblock / Hazard Closure"
            if active_dyn:
                h = active_dyn[0]
                block_desc = f"Dynamic Hazard: {h.get('name', 'Roadblock')}"
                h_min_x, h_min_y = h.get("lon_min", 0.0), h.get("lat_min", 0.0)
                h_max_x, h_max_y = h.get("lon_max", 0.0), h.get("lat_max", 0.0)
                for lon, lat, km in coords_with_km:
                    if h_min_x <= lon <= h_max_x and h_min_y <= lat <= h_max_y:
                        block_km = km
                        break
            elif active_sachet_alerts:
                block_desc = f"SACHET Alert: {active_sachet_alerts[0].get('headline', 'Roadblock')}"
                block_km = coords_with_km[len(coords_with_km) // 2][2] if coords_with_km else 0.0

            first_blocker = {
                "km": round(block_km, 1),
                "location": block_desc,
                "river": "none",
                "risk": RiskLevel.HIGH.value,
                "vehicle_profile": vehicle_profile,
                "load_ratio": 0.0,
                "bankfull_excess": 0.0,
                "inundation_depth_m": 0.0,
                "clearance_m": 0.0,
                "reason": f"Active roadblock or dynamic hazard encountered along transit corridor: {block_desc}",
                "q_threshold": None,
                "q_threshold_support": [None, None],
                "support_state": "ACTIVE_ROADBLOCK",
                "soaking_index": 0.0,
                "closure_likelihood": 1.0,
            }
    else:
        p_roadblock = 0.0

    # Base ambient network disruption probability (accounting for unmodeled traffic accidents,
    # minor seismic tremors, local vehicle breakdowns, and maintenance roadworks).
    # In probability theory for physical transport networks, total closure likelihood is never 0.
    p_ambient = 0.01

    # Joint closure likelihood
    p_closure = round(min(1.0, 1.0 - (1.0 - p_ambient) * (1.0 - p_flood) * (1.0 - p_landslide) * (1.0 - p_roadblock)), 3)

    # Primary hazard determination
    if p_roadblock >= 0.70:
        primary_hazard = "official_roadblock"
    elif p_flood >= p_landslide and p_flood > 0.25:
        primary_hazard = "fluvial_inundation"
    elif p_landslide > p_flood and p_landslide > 0.25:
        primary_hazard = "slope_failure"
    elif p_flood > 0.20 and p_landslide > 0.20:
        primary_hazard = "multi_hazard"
    else:
        primary_hazard = "none"

    # Action recommendation
    if verdict == Verdict.HOLD.value:
        if matched_corridor and not matched_corridor.get("has_reroute", True):
            recommended_action = "HALT_AND_STAGE"
        elif matched_corridor and matched_corridor.get("has_reroute", False):
            recommended_action = "REROUTE"
        else:
            recommended_action = "HOLD"
    elif verdict == Verdict.CAUTION.value:
        recommended_action = "PROCEED_WITH_CAUTION"
    else:
        recommended_action = "PROCEED"

    # Geometric swept-path feasibility gate (IRC:SP:48 for articulated tractor-trailers)
    is_hairpin_unviable = False
    if vehicle_profile == "tractor_trailer":
        has_mountain_terrain = (
            effective_terrain == "mountain_ghat" or
            (matched_corridor and matched_corridor.get("terrain_class") == "mountain_ghat") or
            (spatial_hazards and spatial_hazards.get("total_mountain_km", 0.0) > 5.0)
        )
        if has_mountain_terrain:
            is_hairpin_unviable = True
            verdict = Verdict.HOLD.value
            is_passable = False
            recommended_action = "UNVIABLE_HAIRPIN_RADIUS"
            p_closure = 1.0
            if first_blocker is None:
                first_blocker = {
                    "km": 0.0,
                    "location": matched_corridor["name"] if matched_corridor else "Mountain Ghat Section",
                    "river": "none",
                    "risk": RiskLevel.HIGH.value,
                    "vehicle_profile": vehicle_profile,
                    "load_ratio": 0.0,
                    "bankfull_excess": 0.0,
                    "inundation_depth_m": 0.0,
                    "clearance_m": 0.0,
                    "reason": "Articulated tractor-trailer unviable on mountain ghat terrain: swept-path width exceeds hairpin curve inner radius (IRC:SP:48)",
                    "q_threshold": None,
                    "q_threshold_support": [None, None],
                    "support_state": "GEOMETRIC_HAIRPIN_BLOCK",
                    "soaking_index": 0.0,
                    "closure_likelihood": 1.0,
                }
            if RISK_RANK.get(worst["risk"], 0) < RISK_RANK["HIGH"]:
                worst["risk"] = RiskLevel.HIGH.value
                worst["crossing"] = "Hairpin Curve"
                worst["gauge"] = "IRC:SP:48"

    # Logistics staging town snapping
    safe_staging_node = None
    if first_blocker is not None:
        safe_staging_node = find_safe_staging_node(
            first_blocker_km=first_blocker["km"],
            coords_with_km=coords_with_km,
            corridor_points=corridor_points,
            matched_corridor_id=matched_corridor.get("corridor_id") if matched_corridor else None,
        )

    # Safe dispatch window
    dispatch_window = None
    if is_hairpin_unviable:
        dispatch_window = {
            "is_receding": False,
            "safe_departure_day": None,
            "estimated_wait_hours": None,
            "projected_verdict": None,
            "message": "Articulated tractor-trailer permanently unviable along corridor: geometric hairpin curvature restriction is independent of hydrograph recession.",
        }
    elif not is_passable and check_dispatch_window and gauges_by_day:
        blocking_legs = [leg for leg in legs if RISK_RANK.get(leg["risk"], 0) >= RISK_RANK["HIGH"]]
        dispatch_window = compute_dispatch_window(
            points=points,
            departure_day=departure_day,
            gauges_by_day=gauges_by_day,
            crossings=crossings,
            segments=segments,
            ways=ways,
            vehicle_profile=vehicle_profile,
            max_samples=max_samples,
            blocking_gauges=blocking_legs,
            corridors=corridors,
            corridor_points=corridor_points,
            terrain_class=effective_terrain,
            linear_hazards=linear_hazards,
            allow_uncalibrated=allow_uncalibrated,
            nominal_duration_min=nominal_duration_min,
        )

    warnings = [
        {
            "segment": leg["segment"],
            "gauge": leg["gauge"],
            "river": leg["river"],
            "crossing": leg["crossing"],
            "km": leg["km_from_start"],
            "risk": leg["risk"],
            "p_rp5": leg["p_rp5"],
            "load_ratio": leg["load_ratio"],
            "bankfull_excess": leg["bankfull_excess"],
            "inundation_depth_m": leg["inundation_depth_m"],
            "detail": f"{leg['crossing'] or leg['segment'] or leg['gauge']}: {leg['risk']} at km {leg['km_from_start']} ({leg['reason']})",
        }
        for leg in legs
        if RISK_RANK.get(leg["risk"], 0) >= RISK_RANK["WATCH"]
    ]

    # Append SACHET alert warnings if any
    if spatial_hazards and spatial_hazards.get("active_sachet_alerts"):
        for a in spatial_hazards["active_sachet_alerts"]:
            if a.get("blocked_km", 0.0) > 0.0:
                warnings.append({
                    "segment": "SACHET Alert Zone",
                    "gauge": a.get("sender", "NDMA"),
                    "river": a.get("event", "Disaster"),
                    "crossing": a.get("area_desc", "Corridor"),
                    "km": round(a.get("blocked_km", 0.0), 1),
                    "risk": "CRITICAL" if a.get("severity") in ("Severe", "Extreme") else "HIGH",
                    "p_rp5": 1.0,
                    "load_ratio": 1.0,
                    "bankfull_excess": 1.0,
                    "inundation_depth_m": 0.5,
                    "detail": f"NDMA SACHET [{a.get('severity')}]: {a.get('headline')} ({a.get('blocked_km')} km blocked)",
                })

    if is_hairpin_unviable:
        warnings.append({
            "segment": "Mountain Ghat Geometry",
            "gauge": "IRC:SP:48",
            "river": "none",
            "crossing": "Hairpin Curve",
            "km": 0.0,
            "risk": "HIGH",
            "p_rp5": 0.0,
            "load_ratio": 0.0,
            "bankfull_excess": 0.0,
            "inundation_depth_m": 0.0,
            "detail": "Articulated tractor-trailer unviable on mountain ghat corridor: swept-path exceeds road width at hairpin bends",
        })

    if weather_summary.get("min_visibility_m", 10000.0) < 500.0:
        warnings.append({
            "segment": "Atmospheric Visibility",
            "gauge": "IMD/Open-Meteo",
            "river": "Fog",
            "crossing": "Mountain Pass",
            "km": 0.0,
            "risk": "HIGH" if weather_summary["min_visibility_m"] < 150.0 else "WATCH",
            "p_rp5": 0.0,
            "load_ratio": 0.0,
            "bankfull_excess": 0.0,
            "inundation_depth_m": 0.0,
            "detail": f"Mountain fog restricts sight distance to {weather_summary['min_visibility_m']:.0f}m ({weather_summary['visibility_verdict']}). Reduce speed and maintain convoy spacing.",
        })

    if weather_summary.get("max_wind_gust_kmh", 0.0) >= 55.0:
        warnings.append({
            "segment": "Viaduct Crosswind",
            "gauge": "Wind Monitoring",
            "river": "Brahmaputra",
            "crossing": "Bridge Approach",
            "km": 0.0,
            "risk": "HIGH" if weather_summary["max_wind_gust_kmh"] >= 75.0 else "WATCH",
            "p_rp5": 0.0,
            "load_ratio": 0.0,
            "bankfull_excess": 0.0,
            "inundation_depth_m": 0.0,
            "detail": f"High crosswind gusts ({weather_summary['max_wind_gust_kmh']:.0f} km/h) on viaduct/bridge approaches. Roll-over risk for empty tankers.",
        })

    return {
        "sampled": len(legs),
        "total_distance_km": round(cum_distance_km, 1),
        "terrain_class": effective_terrain,
        "operating_speed_kmh": speed_kmh,
        "speed_interval_kmh": list(TERRAIN_SPEED_BOUNDS.get(effective_terrain, (45.0, 60.0))),
        "elapsed_transit_hours": round(elapsed_hours, 1),
        "t_min_hours": round(legs[-1]["t_min_hours"], 2) if legs else 0.0,
        "t_max_hours": round(legs[-1]["t_max_hours"], 2) if legs else 0.0,
        "transit_interval_hours": [round(legs[-1]["t_min_hours"], 2), round(legs[-1]["t_max_hours"], 2)] if legs else [0.0, 0.0],
        "arrival_day_min": legs[-1]["eval_day_min"] if legs else departure_day,
        "arrival_day_max": legs[-1]["eval_day_max"] if legs else departure_day,
        "depth_is_advisory": True,
        "calibration_status": "UNCALIBRATED" if allow_uncalibrated else "CALIBRATED_HYDROLOGY",
        "is_passable": is_passable,
        "verdict": verdict,
        "action": recommended_action,
        "closure_likelihood": p_closure,
        "p_flood": round(p_flood, 3),
        "p_landslide": p_landslide,
        "p_roadblock": p_roadblock,
        "primary_hazard": primary_hazard,
        "landslide_segments": landslide_segments,
        "landslide_status": landslide_status,
        "spatial_hazards": spatial_hazards,
        "weather_summary": weather_summary,
        "corridor": matched_corridor,
        "first_blocker": first_blocker,
        "safe_staging_km": round(last_safe_km, 1) if first_blocker else round(cum_distance_km, 1),
        "safe_staging_interval_km": [0.0, round(last_safe_km, 1) if first_blocker else round(cum_distance_km, 1)],
        "safe_staging_node": safe_staging_node,
        "gauges_seen": sorted(gauges_seen),
        "segments_seen": sorted(segments_seen),
        "worst": {
            "gauge": worst["gauge"],
            "crossing": worst["crossing"],
            "risk": worst["risk"],
            "p_rp5": worst["p_rp5"],
            "bankfull_excess": worst.get("bankfull_excess", 0.0),
            "inundation_depth_m": worst.get("inundation_depth_m", 0.0),
        },
        "dispatch_window": dispatch_window,
        "warnings": warnings,
        "legs": legs,
    }
