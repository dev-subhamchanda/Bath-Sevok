"""Dynamic road hazard registry endpoints for local avoidance and cut-vertex detection."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import HazardCreate, HazardItem, HazardList, HazardDelete
from app.db.connection import write_cursor, read_cursor
from app.db.queries import (
    insert_dynamic_hazard,
    get_active_dynamic_hazards,
    delete_dynamic_hazard,
)
from app.modules.routing.ors import point_to_bbox, bbox_to_polygon_ring
from app.settings import settings

router = APIRouter(tags=["Hazards"])


@router.post("/hazards", response_model=HazardItem, summary="Register active dynamic hazard for route avoidance")
def create_hazard(
    body: HazardCreate,
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Register ad-hoc roadblock, flood zone, or landslide for proactive routing avoidance."""
    hazard_id = f"haz-{uuid.uuid4().hex[:8]}"

    if body.bbox:
        lon_min, lat_min, lon_max, lat_max = [float(x) for x in body.bbox]
        geometry_type = "bbox"
        ring = bbox_to_polygon_ring(lon_min, lat_min, lon_max, lat_max)
        polygon_geojson = json.dumps({"type": "Polygon", "coordinates": [ring]})
        radius_km = body.radius_km or 2.5
    elif body.point:
        lon, lat = float(body.point[0]), float(body.point[1])
        radius_km = body.radius_km or 2.5
        lon_min, lat_min, lon_max, lat_max = point_to_bbox(lon, lat, radius_km)
        geometry_type = "point"
        ring = bbox_to_polygon_ring(lon_min, lat_min, lon_max, lat_max)
        polygon_geojson = json.dumps({"type": "Polygon", "coordinates": [ring]})
    elif body.polygon:
        pts = body.polygon
        if len(pts) < 3:
            raise HTTPException(status_code=400, detail="Polygon must contain at least 3 vertices")
        ring = [[float(p[0]), float(p[1])] for p in pts]
        if ring[0] != ring[-1]:
            ring.append(list(ring[0]))
        lon_min = min(p[0] for p in ring)
        lat_min = min(p[1] for p in ring)
        lon_max = max(p[0] for p in ring)
        lat_max = max(p[1] for p in ring)
        geometry_type = "polygon"
        radius_km = body.radius_km or 2.5
        polygon_geojson = json.dumps({"type": "Polygon", "coordinates": [ring]})
    else:
        raise HTTPException(
            status_code=400,
            detail="Must specify one geometry representation: 'bbox', 'point', or 'polygon'",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_hours or 24.0)

    hazard_dict = {
        "hazard_id": hazard_id,
        "name": body.name,
        "geometry_type": geometry_type,
        "lon_min": lon_min,
        "lat_min": lat_min,
        "lon_max": lon_max,
        "lat_max": lat_max,
        "polygon_geojson": polygon_geojson,
        "radius_km": radius_km,
        "hazard_type": body.hazard_type,
        "severity": body.severity,
        "active": True,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    }

    with write_cursor(db) as con:
        insert_dynamic_hazard(con, hazard_dict)

    return hazard_dict


@router.get("/hazards", response_model=HazardList, summary="Query active dynamic hazards with optional corridor bbox")
def list_hazards(
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'"),
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Retrieve all unexpired, active dynamic road hazards filtered by corridor bounding box."""
    parsed_bbox = None
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(",")]
            if len(parts) != 4:
                raise ValueError()
            parsed_bbox = (parts[0], parts[1], parts[2], parts[3])
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="bbox parameter must be 4 comma-separated numbers: min_lon,min_lat,max_lon,max_lat",
            )

    with read_cursor(db) as con:
        records = get_active_dynamic_hazards(con, parsed_bbox)

    return {"total": len(records), "hazards": records}


@router.delete("/hazards/{hazard_id}", response_model=HazardDelete, summary="Remove or resolve dynamic hazard")
def remove_hazard(
    hazard_id: str,
    db: str = Query(default_factory=lambda: str(settings.server.db_path)),
):
    """Delete a dynamic hazard from the local registry once cleared."""
    with write_cursor(db) as con:
        deleted = delete_dynamic_hazard(con, hazard_id)

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Hazard '{hazard_id}' not found")

    return {"deleted": True, "hazard_id": hazard_id}
