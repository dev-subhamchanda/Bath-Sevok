"""Landslide and roadblock ingestion service.

Persists real-time NDMA SACHET emergency alerts into DuckDB with native geometries
and seeds baseline mountain corridor susceptibility zones.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.db.connection import write_connection, read_cursor
from app.modules.landslide.sachet_client import fetch_sachet_rss_alerts

logger = logging.getLogger(__name__)

# Mountain corridor definitions for Northeast India
SEED_MOUNTAIN_CORRIDORS = [
    {
        "corridor_id": 9,
        "name": "Meghalaya NH6 Corridor",
        "state": "Meghalaya",
        "baseline_susceptibility": 0.75,
        "notes": "Lumshnong-Sonapur heavy rainfall & sinkhole zone",
        "polygon_wkt": "POLYGON((91.5 25.0, 92.6 25.0, 92.6 25.8, 91.5 25.8, 91.5 25.0))",
    },
    {
        "corridor_id": 5,
        "name": "Assam-Nagaland NH29 Corridor",
        "state": "Nagaland",
        "baseline_susceptibility": 0.70,
        "notes": "Chumukedima landslide belt & Pagla Pahar",
        "polygon_wkt": "POLYGON((93.6 25.5, 94.3 25.5, 94.3 26.1, 93.6 26.1, 93.6 25.5))",
    },
    {
        "corridor_id": 2,
        "name": "Assam-Manipur NH37 Corridor",
        "state": "Manipur",
        "baseline_susceptibility": 0.80,
        "notes": "Irang river gorge & Tupul active slope failure zone",
        "polygon_wkt": "POLYGON((93.0 24.6, 94.2 24.6, 94.2 25.3, 93.0 25.3, 93.0 24.6))",
    },
    {
        "corridor_id": 7,
        "name": "Sikkim NH10 Corridor",
        "state": "Sikkim",
        "baseline_susceptibility": 0.85,
        "notes": "Teesta river canyon & 29th Mile landslide chokepoint",
        "polygon_wkt": "POLYGON((88.2 27.0, 88.8 27.0, 88.8 27.6, 88.2 27.6, 88.2 27.0))",
    },
    {
        "corridor_id": 4,
        "name": "Assam-Mizoram NH54 Corridor",
        "state": "Mizoram",
        "baseline_susceptibility": 0.65,
        "notes": "Tlawng valley steep clay-shale slopes",
        "polygon_wkt": "POLYGON((92.5 23.6, 93.0 23.6, 93.0 24.4, 92.5 24.4, 92.5 23.6))",
    },
    {
        "corridor_id": 6,
        "name": "Assam-Arunachal NH15 Corridor",
        "state": "Arunachal Pradesh",
        "baseline_susceptibility": 0.60,
        "notes": "Siang Himalayan foothills & riverbank erosion",
        "polygon_wkt": "POLYGON((94.8 27.7, 95.8 27.7, 95.8 28.3, 94.8 28.3, 94.8 27.7))",
    },
]


def seed_mountain_corridors(db_path: str | Path | None = None) -> int:
    """Seed baseline mountain corridor geometries into DuckDB if not present."""
    count = 0
    with read_cursor(db_path) as con:
        existing = con.execute("SELECT COUNT(*) FROM mountain_corridor_geoms").fetchone()[0]

    if existing > 0:
        return 0

    # Execute insert synchronously if needed
    import duckdb
    from app.db.connection import get_db_path, _load_spatial_extension
    con = duckdb.connect(get_db_path(db_path), read_only=False)
    _load_spatial_extension(con)
    try:
        for c in SEED_MOUNTAIN_CORRIDORS:
            con.execute(
                """
                INSERT OR REPLACE INTO mountain_corridor_geoms (
                    corridor_id, name, state, baseline_susceptibility, geom, notes
                ) VALUES (
                    ?, ?, ?, ?, ST_GeomFromText(?), ?
                )
                """,
                (
                    c["corridor_id"],
                    c["name"],
                    c["state"],
                    c["baseline_susceptibility"],
                    c["polygon_wkt"],
                    c["notes"],
                ),
            )
            count += 1
    finally:
        con.close()

    return count


async def sync_sachet_alerts(
    db_path: str | Path | None = None,
    client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """Fetch live NDMA SACHET alerts and upsert into DuckDB."""
    # Ensure mountain corridor seeds exist
    seed_mountain_corridors(db_path)

    # Fetch alerts without holding DB lock
    alerts = await fetch_sachet_rss_alerts(client=client)

    inserted = 0
    pruned = 0

    async with write_connection(db_path) as con:
        # Prune old expired alerts older than 2 days
        pruned = con.execute(
            "SELECT COUNT(*) FROM sachet_alerts WHERE expires_at < now() - INTERVAL '2 days'"
        ).fetchone()[0]
        con.execute(
            "DELETE FROM sachet_alerts WHERE expires_at < now() - INTERVAL '2 days'"
        )

        for a in alerts:
            try:
                con.execute(
                    """
                    INSERT OR REPLACE INTO sachet_alerts (
                        identifier, sender, sent_at, effective_at, expires_at,
                        event, severity, urgency, certainty, headline,
                        instruction, area_desc, polygon_wkt, geom
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ST_GeomFromText(?)
                    )
                    """,
                    (
                        a["identifier"],
                        a["sender"],
                        a["sent_at"],
                        a["effective_at"],
                        a["expires_at"],
                        a["event"],
                        a["severity"],
                        a["urgency"],
                        a["certainty"],
                        a["headline"],
                        a["instruction"],
                        a["area_desc"],
                        a["polygon_wkt"],
                        a["polygon_wkt"],
                    ),
                )
                inserted += 1
            except Exception as e:
                logger.warning(f"Failed to upsert SACHET alert {a.get('identifier')}: {e}")

    return {
        "fetched": len(alerts),
        "inserted": inserted,
        "pruned": pruned,
    }
