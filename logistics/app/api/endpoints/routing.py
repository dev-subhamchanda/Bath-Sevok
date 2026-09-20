"""Route risk scoring, ranking, and automated dispatch endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import (
    RouteRequest,
    ScoreRequest,
    DispatchRequest,
    RouteCandidate,
    RouteRisk,
    ScoreResponse,
    DispatchResponse,
)
from app.db.connection import read_cursor
from app.db.queries import (
    get_latest_run_id,
    get_gauge_levels,
    get_multi_day_gauge_levels,
    get_crossings,
    get_road_segments,
    get_road_ways,
    get_corridor_definitions,
    get_all_corridor_points,
    get_linear_hazards,
    get_spatial_route_hazards,
    get_active_dynamic_hazards,
)
from app.modules.risk.scorer import score_route_geometry
from app.modules.risk.ranker import format_ranked_response
from app.modules.risk.geo import haversine_km
from app.modules.routing.ors import (
    fetch_ors_routes,
    normalize_hazard,
    filter_hazards_by_corridor,
    filter_start_end_proximity,
    filter_hazards_by_polyline_intersection,
    build_avoid_multipolygon,
    check_route_hazard_intersections,
    RouteBlockedException,
)
from app.modules.routing.tomtom import fetch_tomtom_routes
from app.settings import settings

router = APIRouter(tags=["Routing"])


def _evaluate_fleet(
    points, day, gauges, crossings, segments, ways, max_samples,
    departure_day, gauges_by_day, fleet, corridors, corridor_points,
    linear_hazards, spatial_hazards, base_verdict, base_passable,
    base_speed, base_hours, base_blocker, nominal_duration_min=None,
    hazard_overrides=None,
):
    """Score route for each vehicle profile and return fleet summary dict."""
    from app.enums import VERDICT_RANK

    fleet_evals = {}
    worst_verdict = base_verdict
    all_passable = base_passable
    min_speed = base_speed
    max_hours = base_hours
    limiting_profile = fleet[0] if fleet else ""
    limiting_reason = base_blocker["reason"] if base_blocker else "Standard transit"

    for vp in fleet:
        v_res = score_route_geometry(
            points, day, gauges, crossings, segments, ways,
            max_samples=max_samples, departure_day=departure_day,
            gauges_by_day=gauges_by_day, vehicle_profile=vp,
            corridors=corridors, corridor_points=corridor_points,
            linear_hazards=linear_hazards, spatial_hazards=spatial_hazards,
            nominal_duration_min=nominal_duration_min,
        )
        v_verdict = v_res["verdict"]
        v_action = v_res["action"]
        v_passable = v_res["is_passable"]
        v_blocker = v_res.get("first_blocker")

        if hazard_overrides:
            v_verdict = "HOLD"
            v_action = "HALT_AND_STAGE"
            v_passable = False
            v_blocker = base_blocker

        fleet_evals[vp] = {
            "verdict": v_verdict,
            "action": v_action,
            "is_passable": v_passable,
            "operating_speed_kmh": v_res["operating_speed_kmh"],
            "elapsed_transit_hours": v_res["elapsed_transit_hours"],
            "first_blocker": v_blocker,
        }
        if not v_passable:
            all_passable = False
        if VERDICT_RANK.get(v_verdict, 0) > VERDICT_RANK.get(worst_verdict, 0):
            worst_verdict = v_verdict
            limiting_profile = vp
            limiting_reason = v_blocker["reason"] if v_blocker else "Physical/hazard constraint"
        min_speed = min(min_speed, v_res["operating_speed_kmh"])
        max_hours = max(max_hours, v_res["elapsed_transit_hours"])

    return {
        "convoy_verdict": worst_verdict,
        "convoy_passable": all_passable,
        "convoy_speed_kmh": min_speed,
        "convoy_transit_hours": max_hours,
        "limiting_vehicle": limiting_profile,
        "limiting_reason": limiting_reason,
        "vehicle_evaluations": fleet_evals,
    }


@router.post("/route-risk", response_model=RouteRisk, summary="Score route geometry against gauge risk")
def route_risk(body: RouteRequest, db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        gauges = get_gauge_levels(con, rid, body.day)
        gauges_by_day = get_multi_day_gauge_levels(con, rid)
        crossings = get_crossings(con)
        segments = get_road_segments(con)
        ways = get_road_ways(con)
        corridors = get_corridor_definitions(con)
        corridor_points = get_all_corridor_points(con)
        linear_hazards = get_linear_hazards(con)
        pt_tuples = [(p[0], p[1]) for p in body.points if len(p) >= 2]
        spatial_hazards = get_spatial_route_hazards(con, pt_tuples)

    try:
        scored = score_route_geometry(
            body.points,
            day=body.day,
            gauges=gauges,
            crossings=crossings,
            segments=segments,
            ways=ways,
            max_samples=body.max_samples,
            departure_day=body.day,
            gauges_by_day=gauges_by_day,
            vehicle_profile=body.vehicle_profile,
            corridors=corridors,
            corridor_points=corridor_points,
            linear_hazards=linear_hazards,
            spatial_hazards=spatial_hazards,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"run_id": rid, "day": body.day, "vehicle_profile": body.vehicle_profile, **scored}


@router.post("/score-routes", response_model=ScoreResponse, summary="Rank candidate routes from the routing backend")
def score_routes(body: ScoreRequest, db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        gauges = get_gauge_levels(con, rid, body.day)
        gauges_by_day = get_multi_day_gauge_levels(con, rid)
        crossings = get_crossings(con)
        segments = get_road_segments(con)
        ways = get_road_ways(con)
        corridors = get_corridor_definitions(con)
        corridor_points = get_all_corridor_points(con)
        linear_hazards = get_linear_hazards(con)
        spatial_hazards_map = {
            cand.route_id: get_spatial_route_hazards(
                con, [(p[0], p[1]) for p in cand.points if len(p) >= 2]
            )
            for cand in body.routes
        }

    scored_list = []
    for cand in body.routes:
        try:
            res = score_route_geometry(
                cand.points,
                body.day,
                gauges,
                crossings,
                segments,
                ways,
                max_samples=body.max_samples,
                departure_day=body.day,
                gauges_by_day=gauges_by_day,
                vehicle_profile=body.vehicle_profile,
                corridors=corridors,
                corridor_points=corridor_points,
                linear_hazards=linear_hazards,
                spatial_hazards=spatial_hazards_map.get(cand.route_id),
            )
            cand_entry = {"route_id": cand.route_id, "coordinates": [list(p[:2]) for p in cand.points if len(p) >= 2], **res}
            if body.fleet:
                cand_entry["fleet_summary"] = _evaluate_fleet(
                    cand.points, body.day, gauges, crossings, segments, ways,
                    body.max_samples, body.day, gauges_by_day, body.fleet,
                    corridors, corridor_points, linear_hazards,
                    spatial_hazards_map.get(cand.route_id),
                    base_verdict=res["verdict"], base_passable=res["is_passable"],
                    base_speed=res["operating_speed_kmh"],
                    base_hours=res["elapsed_transit_hours"],
                    base_blocker=res.get("first_blocker"),
                )
            scored_list.append(cand_entry)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    return format_ranked_response({"run_id": rid, "day": body.day, "vehicle_profile": body.vehicle_profile}, scored_list)


@router.post("/dispatch", response_model=DispatchResponse, summary="Start/end in, ranked flood-aware routes out")
async def dispatch(body: DispatchRequest, db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    for pt in (body.start, body.end):
        if not (-180.0 <= pt[0] <= 180.0 and -90.0 <= pt[1] <= 90.0):
            raise HTTPException(status_code=400, detail=f"coordinate out of range: {pt}")

    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        gauges = get_gauge_levels(con, rid, body.day)
        gauges_by_day = get_multi_day_gauge_levels(con, rid)
        crossings = get_crossings(con)
        segments = get_road_segments(con)
        ways = get_road_ways(con)
        corridors = get_corridor_definitions(con)
        corridor_points = get_all_corridor_points(con)
        linear_hazards = get_linear_hazards(con)

    # Collect candidate hazards from request parameters (and optional local registry)
    candidate_hazards = []
    if body.hazard_points:
        for hp in body.hazard_points:
            try:
                candidate_hazards.append(normalize_hazard(hp))
            except Exception:
                pass

    if getattr(body, "hazard_pairs", None):
        for pair in body.hazard_pairs:
            try:
                candidate_hazards.append(normalize_hazard(pair))
            except Exception:
                pass

    if body.avoid_points:
        for pt in body.avoid_points:
            try:
                candidate_hazards.append(normalize_hazard(pt))
            except Exception:
                pass

    if body.avoid_boxes:
        for b in body.avoid_boxes:
            try:
                candidate_hazards.append(normalize_hazard(b))
            except Exception:
                pass

    if body.avoid_polygons:
        for poly in body.avoid_polygons:
            try:
                candidate_hazards.append(normalize_hazard(poly))
            except Exception:
                pass

    if body.include_local_hazards:
        with read_cursor(db) as con:
            db_hazards = get_active_dynamic_hazards(con)
            for h in db_hazards:
                try:
                    candidate_hazards.append(normalize_hazard(h))
                except Exception:
                    pass

    # Retain all provided candidate hazards for post-route intersection checking
    raw_candidate_hazards = list(candidate_hazards)

    # For ORS avoid_polygons, exclude hazards touching start/end to prevent ORS HTTP 400 errors
    avoid_hazards = filter_start_end_proximity(candidate_hazards, body.start, body.end, min_dist_km=1.5)

    meta = {}
    if body.routes:
        candidates = body.routes
    else:
        try:
            if body.provider == "tomtom":
                routes = await fetch_tomtom_routes(
                    body.start, body.end, key=body.tomtom_key, alternates=body.alternates
                )
            else:
                # Direct ORS avoidance routing
                if not avoid_hazards:
                    routes = await fetch_ors_routes(
                        body.start,
                        body.end,
                        key=body.ors_key,
                        alternates=body.alternates,
                        vehicle_profile=body.vehicle_profile,
                    )
                else:
                    avoid_multi = build_avoid_multipolygon(avoid_hazards, max_polygons=50)
                    try:
                        routes = await fetch_ors_routes(
                            body.start,
                            body.end,
                            key=body.ors_key,
                            alternates=body.alternates,
                            vehicle_profile=body.vehicle_profile,
                            avoid_polygons=avoid_multi,
                        )
                    except RouteBlockedException:
                        # Cut-vertex severed physical roads: fallback to baseline route so caller can post-process
                        routes = await fetch_ors_routes(
                            body.start,
                            body.end,
                            key=body.ors_key,
                            alternates=body.alternates,
                            vehicle_profile=body.vehicle_profile,
                        )

            candidates = [RouteCandidate(route_id=r["route_id"], points=r["points"]) for r in routes]
            meta = {r["route_id"]: {k: v for k, v in r.items() if k not in ("route_id", "points")} for r in routes}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"routing backend error: {e}")

    with read_cursor(db) as con:
        spatial_hazards_map = {
            cand.route_id: get_spatial_route_hazards(
                con,
                [(p[0], p[1]) for p in cand.points if len(p) >= 2],
                extra_hazards=raw_candidate_hazards,
            )
            for cand in candidates
        }

    scored_list = []
    for cand in candidates:
        cand_meta = meta.get(cand.route_id, {})
        cand_duration = cand_meta.get("duration_min")
        try:
            res = score_route_geometry(
                cand.points,
                body.day,
                gauges,
                crossings,
                segments,
                ways,
                max_samples=body.max_samples,
                departure_day=body.day,
                gauges_by_day=gauges_by_day,
                vehicle_profile=body.vehicle_profile,
                corridors=corridors,
                corridor_points=corridor_points,
                linear_hazards=linear_hazards,
                spatial_hazards=spatial_hazards_map.get(cand.route_id),
                nominal_duration_min=cand_duration,
            )

            cand_entry = {
                "route_id": cand.route_id,
                "coordinates": [list(p[:2]) for p in cand.points if len(p) >= 2],
                **cand_meta,
                **res,
            }

            cum_km = 0.0
            prev_pt = None
            coords_tuples = []
            for p in cand.points:
                if len(p) >= 2:
                    if prev_pt is not None:
                        cum_km += haversine_km(prev_pt[0], prev_pt[1], p[0], p[1])
                    prev_pt = p
                    coords_tuples.append((float(p[0]), float(p[1]), round(cum_km, 1)))

            hit_hazards = check_route_hazard_intersections(coords_tuples, raw_candidate_hazards, buffer_km=1.0)
            cand_entry["intersected_hazards"] = hit_hazards

            if hit_hazards:
                cand_entry["verdict"] = "HOLD"
                cand_entry["action"] = "HALT_AND_STAGE"
                cand_entry["p_roadblock"] = 1.0
                cand_entry["closure_likelihood"] = 1.0
                cand_entry["is_passable"] = False
                h0 = hit_hazards[0]
                cand_entry["first_blocker"] = {
                    "km": h0.get("km_from_start", 0.0),
                    "location": h0.get("location") or h0.get("name") or "Hazard Roadblock",
                    "river": "none",
                    "risk": "HIGH",
                    "vehicle_profile": body.vehicle_profile,
                    "reason": f"Active roadblock or dynamic hazard encountered along corridor: {h0.get('name')}",
                    "closure_likelihood": 1.0,
                }
                block_km = h0.get("km_from_start", 0.0)
                if cand_entry.get("safe_staging_km") is None or cand_entry["safe_staging_km"] > block_km:
                    cand_entry["safe_staging_km"] = block_km
                    cand_entry["safe_staging_interval_km"] = [0.0, block_km]

            if body.fleet:
                cand_entry["fleet_summary"] = _evaluate_fleet(
                    cand.points, body.day, gauges, crossings, segments, ways,
                    body.max_samples, body.day, gauges_by_day, body.fleet,
                    corridors, corridor_points, linear_hazards,
                    spatial_hazards_map.get(cand.route_id),
                    base_verdict=cand_entry["verdict"],
                    base_passable=cand_entry["is_passable"],
                    base_speed=res["operating_speed_kmh"],
                    base_hours=res["elapsed_transit_hours"],
                    base_blocker=cand_entry.get("first_blocker"),
                    nominal_duration_min=cand_duration,
                    hazard_overrides=hit_hazards or None,
                )

            scored_list.append(cand_entry)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    all_hits = []
    seen_hit_ids = set()
    for s in scored_list:
        for h in s.get("intersected_hazards", []):
            hid = str(h.get("hazard_id") or "")
            if hid and hid not in seen_hit_ids:
                seen_hit_ids.add(hid)
                all_hits.append(h)

    resp = format_ranked_response(
        {"run_id": rid, "day": body.day, "start": body.start, "end": body.end, "vehicle_profile": body.vehicle_profile},
        scored_list,
    )
    resp["intersected_hazards"] = all_hits
    return resp
