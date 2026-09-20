"""Server-Sent Events (SSE) generator for live dashboard streaming."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, List, Optional

from app.modules.alerts.bus import alert_bus


async def generate_alert_stream(
    run_id: int,
    alerts: List[Dict[str, Any]],
    heartbeat_sec: float = 15.0,
    follow: bool = False,
    max_events: Optional[int] = None,
) -> AsyncGenerator[str, None]:
    """Yield snapshot, periodic heartbeats, and live alert events to connected clients."""
    # 1. Yield initial snapshot of current firing alerts
    snapshot_data = {
        "run_id": run_id,
        "alerts": alerts,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    yield f"event: snapshot\ndata: {json.dumps(snapshot_data)}\n\n"

    # 2. Yield initial heartbeat
    heartbeat_data = {
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    yield f"event: heartbeat\ndata: {json.dumps(heartbeat_data)}\n\n"

    if not follow:
        return

    # 3. If follow is requested, subscribe to live alert bus for real-time push events
    q = alert_bus.subscribe()
    events_sent = 0
    try:
        while True:
            if max_events is not None and events_sent >= max_events:
                break
            try:
                event = await asyncio.wait_for(q.get(), timeout=heartbeat_sec)
                yield f"event: alert\ndata: {json.dumps(event)}\n\n"
                events_sent += 1
            except asyncio.TimeoutError:
                heartbeat_data = {
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
                yield f"event: heartbeat\ndata: {json.dumps(heartbeat_data)}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        alert_bus.unsubscribe(q)
