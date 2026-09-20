"""Logistics AI feature extraction endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import ScoreRequest
from app.db.connection import read_cursor
from app.db.queries import (
    get_latest_run_id,
    get_gauge_levels,
    get_crossings,
    get_road_segments,
    get_road_ways,
    get_linear_hazards,
)
from app.modules.risk.scorer import score_route_geometry
from app.modules.logistics_ai.features import extract_route_features
from app.settings import settings

router = APIRouter(tags=["Logistics AI"])


@router.post("/features", summary="Flat ML feature vectors per route plus physics floor")
def features(body: ScoreRequest, db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        gauges = get_gauge_levels(con, rid, body.day)
        crossings = get_crossings(con)
        segments = get_road_segments(con)
        ways = get_road_ways(con)
        linear_hazards = get_linear_hazards(con)

    routes = []
    for cand in body.routes:
        try:
            scored = score_route_geometry(
                cand.points,
                body.day,
                gauges,
                crossings,
                segments,
                ways,
                max_samples=body.max_samples,
                linear_hazards=linear_hazards,
            )
            feat = extract_route_features(scored)
            routes.append({
                "route_id": cand.route_id,
                "features": feat,
                "legs": [
                    {
                        "lon": leg["lon"],
                        "lat": leg["lat"],
                        "gauge": leg["gauge"],
                        "gauge_km": leg["gauge_km"],
                        "q_mean": leg["q_mean"],
                        "q_p50": leg["q_p50"],
                        "q_p90": leg["q_p90"],
                        "load_ratio": leg["load_ratio"],
                        "p_rp2": leg["p_rp2"],
                        "p_rp5": leg["p_rp5"],
                        "p_rp10": leg["p_rp10"],
                        "trend": leg["trend"],
                        "risk": leg["risk"],
                        "segment": leg["segment"],
                    }
                    for leg in scored.get("legs", [])
                ],
            })
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    return {"run_id": rid, "day": body.day, "routes": routes}
