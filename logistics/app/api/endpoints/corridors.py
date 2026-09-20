"""Corridor assessments and point forecast endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import CorridorList
from app.db.connection import read_cursor
from app.db.queries import (
    get_latest_run_id,
    get_all_corridors,
    get_corridor_detail,
    get_points,
)
from app.enums import RiskType
from app.settings import settings

router = APIRouter(tags=["Corridors"])


@router.get("/corridors", response_model=CorridorList, summary="Corridor risk/action for the latest run")
def corridors(db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        rows = get_all_corridors(con, rid)
    return {"run_id": rid, "corridors": rows}


@router.get("/corridors/{corridor_id}", summary="Corridor detail with day-2 point data")
def corridor_detail(
    corridor_id: int,
    day: int = Query(default=2, ge=0, le=6),
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        detail = get_corridor_detail(con, corridor_id, rid, day)
    if not detail:
        raise HTTPException(status_code=404, detail=f"unknown corridor: {corridor_id}")
    return detail


@router.get("/points", summary="Point forecasts, optionally filtered by risk")
def points(
    risk: RiskType | None = Query(default=None),
    day: int | None = Query(default=None, ge=0, le=6),
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        rows = get_points(con, rid, risk=risk, day=day)
    return {"run_id": rid, "points": rows}
