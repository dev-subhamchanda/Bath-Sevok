"""Alert and real-time streaming endpoints."""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.api.schemas import AlertList
from app.db.connection import read_cursor
from app.db.queries import (
    get_latest_run_id,
    get_firing_alerts,
    get_weather_signals,
    get_gauge_cells,
    get_corridor_points_coords,
)
from app.enums import RiskType
from app.modules.alerts.sse import generate_alert_stream
from app.modules.risk.geo import haversine_km
from app.settings import settings

router = APIRouter(tags=["Alerts"])


@router.get(
    "/alerts",
    response_model=AlertList,
    summary="Firing alerts at or above a severity floor",
)
def alerts(
    floor: RiskType = Query(default="WATCH"),
    corridor_id: Optional[int] = Query(default=None, description="Optional corridor identifier filter"),
    limit: Optional[int] = Query(default=50, ge=1, le=500, description="Maximum alerts to return"),
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Query currently active threshold alerts across freight corridors with weather context."""
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        firing = get_firing_alerts(con, rid, floor=floor)
        wx = get_weather_signals(con, rid)
        gauges = get_gauge_cells(con)
        point_coords = get_corridor_points_coords(con)

    # Optional corridor filtering
    if corridor_id is not None:
        firing = [a for a in firing if a.get("corridor_id") == corridor_id]

    # Attach weather context based on spatial proximity
    for a in firing:
        a["weather"] = None
        target_point = a.get("worst_point", "")
        if target_point in point_coords and gauges:
            pt_lon, pt_lat = point_coords[target_point]
            best_gauge = min(
                gauges,
                key=lambda g: haversine_km(pt_lon, pt_lat, g["cell_lon"], g["cell_lat"]),
            )
            dist_km = haversine_km(pt_lon, pt_lat, best_gauge["cell_lon"], best_gauge["cell_lat"])
            if dist_km <= 25.0 and best_gauge["gauge"] in wx:
                a["weather"] = wx[best_gauge["gauge"]]

    if limit is not None:
        firing = firing[:limit]

    return {"run_id": rid, "floor": floor, "alerts": firing}


@router.get(
    "/alerts/stream",
    summary="Server-sent persistent stream of firing alerts",
)
def alerts_stream(
    floor: RiskType = Query(default="WATCH"),
    corridor_id: Optional[int] = Query(default=None, description="Optional corridor identifier filter"),
    heartbeat_interval_sec: float = Query(default=15.0, ge=1.0, le=300.0, description="Heartbeat interval in seconds"),
    follow: bool = Query(default=False, description="Whether to keep stream open for live push events"),
    max_events: Optional[int] = Query(default=None, ge=1, le=1000, description="Optional maximum live events before closing"),
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Server-Sent Events (SSE) stream for dispatch dashboard integration."""
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            firing = []
            rid = 0
        else:
            firing = get_firing_alerts(con, rid, floor=floor)

    if corridor_id is not None:
        firing = [a for a in firing if a.get("corridor_id") == corridor_id]

    return StreamingResponse(
        generate_alert_stream(
            rid,
            firing,
            heartbeat_sec=heartbeat_interval_sec,
            follow=follow,
            max_events=max_events,
        ),
        media_type="text/event-stream",
    )
