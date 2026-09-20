"""Health and run metadata endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import HealthResponse
from app.db.connection import read_cursor
from app.db.queries import get_latest_run_id, get_run_metadata
from app.settings import settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Liveness + latest run id")
def health(db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
    if rid is None:
        raise HTTPException(status_code=404, detail="no runs stored yet")
    return {"ok": True, "db": db, "latest_run": rid}


@router.get("/runs/latest", summary="Latest run metadata + row counts")
def runs_latest(db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rid = get_latest_run_id(con)
        if rid is None:
            raise HTTPException(status_code=404, detail="no runs stored yet")
        meta = get_run_metadata(con, rid)
    if not meta:
        raise HTTPException(status_code=404, detail="run not found")
    return meta
