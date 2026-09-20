"""Automated background scheduler running within FastAPI lifespan.

Runs decoupled periodic jobs for fast alert evaluation, NDMA SACHET disaster sync,
hourly weather polling, and retention cleanup without external cron dependencies.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import duckdb

from app.settings import settings
from app.db.connection import read_cursor, write_connection
from app.db.queries import (
    get_latest_run_id,
    get_gauge_cells,
    get_all_corridor_points,
    insert_weather_signals,
    upsert_weather_grid,
    get_firing_alerts,
)
from app.modules.weather.client import poll_gauge_weather, poll_weather_grid
from app.modules.landslide.ingest import sync_sachet_alerts
from app.modules.alerts.cooldown import evaluate_alert_cooling, record_alert_fire
from app.modules.alerts.webhook import broadcast_alerts
from app.modules.alerts.bus import alert_bus

logger = logging.getLogger(__name__)

# Event to trigger immediate out-of-band alert check
alert_trigger_event: asyncio.Event = asyncio.Event()


def trigger_alert_check() -> None:
    """Trigger an immediate alert evaluation cycle without waiting for the periodic timer."""
    alert_trigger_event.set()


async def run_alert_evaluation_job(
    floor: Optional[str] = None,
    db_path: Optional[str] = None,
) -> int:
    """Evaluate firing alerts, record cooldown state, broadcast webhooks, and push to SSE bus."""
    target_floor = floor or settings.alerts.default_floor
    with read_cursor(db_path) as con:
        run_id = get_latest_run_id(con)
        if run_id is None:
            return 0
        firing = get_firing_alerts(con, run_id, floor=target_floor)

        to_fire: List[Dict[str, Any]] = []
        for a in firing:
            should_fire, _ = evaluate_alert_cooling(con, a["key"], a["risk"])
            if should_fire:
                to_fire.append(a)

    if not to_fire:
        return 0

    # 1. Unconditionally record firing state into alert_state table
    async with write_connection(db_path) as con:
        for a in to_fire:
            record_alert_fire(con, a["key"], a["risk"])

    # 2. Dispatch external webhooks if configured
    if settings.alerts.webhooks:
        try:
            await broadcast_alerts(to_fire)
        except Exception as e:
            logger.warning(f"Webhook broadcast failed: {e}")

    # 3. Publish alert events to in-memory SSE bus for live dashboard subscribers
    for a in to_fire:
        alert_bus.publish({
            "type": "alert",
            "run_id": run_id,
            "key": a.get("key"),
            "target": a.get("target"),
            "risk": a.get("risk"),
            "action": a.get("action"),
            "worst_point": a.get("worst_point"),
            "prob": a.get("prob"),
            "detail": a.get("detail"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return len(to_fire)


async def run_sachet_sync_job(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Fetch live NDMA SACHET disaster and roadblock alerts into DuckDB."""
    try:
        return await sync_sachet_alerts(db_path=db_path)
    except Exception as e:
        logger.warning(f"SACHET sync job encountered error: {e}")
        return {"error": str(e)}


async def run_weather_poll_job(db_path: Optional[str] = None) -> int:
    """Poll Open-Meteo weather parameters for all gauge cells and corridor points, persisting to DuckDB."""
    with read_cursor(db_path) as con:
        run_id = get_latest_run_id(con)
        gauges = get_gauge_cells(con)
        corridor_pts = get_all_corridor_points(con)

    gauge_count = 0
    if gauges:
        results = await poll_gauge_weather(gauges)
        if run_id is not None:
            async with write_connection(db_path) as con:
                insert_weather_signals(con, run_id, results)
        gauge_count = len(results)

    if corridor_pts:
        pts_to_poll = [
            {
                "point_id": f"cp_{p['corridor_id']}_{p['point_name'].lower().replace(' ', '_')}",
                "point_name": p["point_name"],
                "corridor_id": p["corridor_id"],
                "river": p.get("river"),
                "lon": p["lon"],
                "lat": p["lat"],
            }
            for p in corridor_pts
        ]
        grid_results = await poll_weather_grid(pts_to_poll)
        if grid_results:
            async with write_connection(db_path) as con:
                upsert_weather_grid(con, grid_results)

    return gauge_count


async def run_retention_cleanup_job(db_path: Optional[str] = None) -> None:
    """Auto-prune old forecast runs beyond the retention window."""
    days = settings.server.retention_days
    async with write_connection(db_path) as con:
        con.execute(
            """DELETE FROM forecast_runs
               WHERE run_at < now() - INTERVAL ? DAYS""",
            [days],
        )


async def background_worker_loop() -> None:
    """Multi-cadence event-driven execution loop running inside the server process."""
    now = time.monotonic()
    last_alert_eval = 0.0
    last_sachet_sync = now
    last_weather_poll = now
    last_retention_cleanup = now

    alert_interval = max(5.0, float(settings.alerts.poll_interval_sec))
    sachet_interval = max(60.0, float(settings.landslide.sachet_poll_interval_minutes * 60))
    weather_interval = max(300.0, float(settings.weather.poll_interval_hours * 3600))
    cleanup_interval = 86400.0  # 24 hours

    while True:
        try:
            # Wait for alert trigger signal or 5-second tick timeout
            try:
                await asyncio.wait_for(alert_trigger_event.wait(), timeout=5.0)
                alert_trigger_event.clear()
                force_alert = True
            except asyncio.TimeoutError:
                force_alert = False

            now = time.monotonic()

            # 1. Fast Cadence: Alert Evaluation and Webhook/SSE Dispatch
            if force_alert or (now - last_alert_eval >= alert_interval):
                try:
                    await run_alert_evaluation_job()
                except Exception as e:
                    logger.error(f"Alert evaluation job failed: {e}")
                last_alert_eval = now

            # 2. Medium Cadence: NDMA SACHET Emergency Roadblocks & Disasters
            if now - last_sachet_sync >= sachet_interval:
                try:
                    await run_sachet_sync_job()
                except Exception as e:
                    logger.warning(f"SACHET sync job failed: {e}")
                last_sachet_sync = now

            # 3. Hourly Cadence: Open-Meteo Weather Grid & Gauges Polling
            if now - last_weather_poll >= weather_interval:
                try:
                    await run_weather_poll_job()
                except Exception as e:
                    logger.warning(f"Weather poll job failed: {e}")
                last_weather_poll = now

            # 4. Daily Cadence: Database Retention Cleanup
            if now - last_retention_cleanup >= cleanup_interval:
                try:
                    await run_retention_cleanup_job()
                except Exception as e:
                    logger.warning(f"Retention cleanup job failed: {e}")
                last_retention_cleanup = now

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Unexpected error in background worker loop: {e}")
            await asyncio.sleep(5.0)
