"""Road segments and threshold query endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Query
from app.db.connection import read_cursor
from app.db.queries import get_road_segments
from app.settings import settings

router = APIRouter(tags=["Segments"])


@router.get("/segments", summary="Road segments with threshold metadata")
def segments(db: str = Query(default_factory=lambda: str(settings.server.db_path))):
    with read_cursor(db) as con:
        rows = get_road_segments(con)
    return {
        "segments": rows,
        "note": "validated closure thresholds pending" if not rows else "ok",
    }
