"""Weather observation, forecast, visibility, and route weather profile endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import (
    WeatherList,
    WeatherDetail,
    WeatherPoint,
    WeatherRequest,
    WeatherResponse,
)
from app.db.connection import read_cursor
from app.db.queries import (
    get_corridor_weather_summary,
    get_corridor_weather_details,
    get_cached_weather_grid,
)
from app.modules.risk.geo import sample_coordinates, haversine_km
from app.modules.weather.metrics import evaluate_weather
from app.modules.weather.client import poll_weather_grid
from app.settings import settings

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get(
    "/corridors",
    response_model=WeatherList,
    summary="Corridor weather risk summary across all 37 corridors",
)
def weather_corridors_summary(
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Retrieve regional weather overview across all registered corridors."""
    with read_cursor(db) as con:
        rows = get_corridor_weather_summary(con)
    return {"corridors": rows}


@router.get(
    "/corridors/{corridor_id}",
    response_model=WeatherDetail,
    summary="Point-by-point weather metrics for a specific corridor",
)
def weather_corridor_detail(
    corridor_id: int,
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Retrieve detailed weather forecast metrics for a corridor and its chokepoints."""
    with read_cursor(db) as con:
        detail = get_corridor_weather_details(con, corridor_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"unknown corridor: {corridor_id}")
    return detail


@router.get(
    "/points",
    response_model=List[WeatherPoint],
    summary="List all monitored weather points",
)
def weather_points(
    corridor_id: Optional[int] = Query(default=None),
    risk: Optional[str] = Query(default=None),
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Retrieve weather forecast parameters for all monitored chokepoints."""
    with read_cursor(db) as con:
        points = get_cached_weather_grid(con)

    if corridor_id is not None:
        points = [p for p in points if p.get("corridor_id") == corridor_id]
    if risk is not None:
        points = [p for p in points if p.get("risk") == risk.upper()]

    return points


@router.post(
    "/route",
    response_model=WeatherResponse,
    summary="Spatiotemporal weather profile for a route polyline",
)
async def route_weather_profile(
    req: WeatherRequest,
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Evaluate where and when precipitation, fog, and crosswinds occur along a route polyline."""
    if len(req.points) < 2:
        raise HTTPException(status_code=422, detail="Route polyline must contain at least 2 points")

    # Sample points along route
    sampled_coords = sample_coordinates(req.points, max_samples=req.max_samples)

    with read_cursor(db) as con:
        weather_grid = get_cached_weather_grid(con)

    if req.live:
        # Live query for the sampled coordinates
        live_points = [
            {"point_id": f"pt_{i}", "point_name": f"Leg {i}", "lon": pt[0], "lat": pt[1]}
            for i, pt in enumerate(sampled_coords)
        ]
        weather_grid = await poll_weather_grid(live_points)

    # Calculate cumulative distance and elapsed hours
    cum_dist = 0.0
    speed_kmh = req.operating_speed_kmh or 40.0
    legs = []

    for i, pt in enumerate(sampled_coords):
        if i > 0:
            prev_pt = sampled_coords[i - 1]
            d = haversine_km(prev_pt[0], prev_pt[1], pt[0], pt[1])
            cum_dist += d
        elapsed_h = cum_dist / speed_kmh
        # Interval (+-20% uncertainty)
        t_min_h = elapsed_h * 0.85
        t_max_h = elapsed_h * 1.25

        legs.append({
            "lon": pt[0],
            "lat": pt[1],
            "km_from_start": round(cum_dist, 1),
            "eval_day": 0,
            "gauge": "route_waypoint",
            "river": "none",
            "gauge_km": 0.0,
            "crossing": None,
            "clearance_m": 2.0,
            "load_ratio": 0.0,
            "bankfull_excess": 0.0,
            "inundation_depth_m": 0.0,
            "risk": "OK",
            "reason": "Clear terrain",
            "closure_likelihood": 0.0,
            "t_min_hours": round(t_min_h, 2),
            "t_max_hours": round(t_max_h, 2),
            "elapsed_hours": round(elapsed_h, 2),
        })

    dep_time = None
    if req.departure_time:
        try:
            dep_time = datetime.fromisoformat(req.departure_time.replace("Z", "+00:00"))
        except Exception:
            dep_time = None

    weather_summary = evaluate_weather(legs, weather_grid, dep_time)

    return {
        "total_distance_km": round(cum_dist, 1),
        "weather_summary": weather_summary,
        "legs": legs,
    }
