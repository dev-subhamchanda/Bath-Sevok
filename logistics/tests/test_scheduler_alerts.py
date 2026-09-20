"""Unit and integration tests for the redesigned scheduler, AlertBus, and persistent SSE streaming."""

import asyncio
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.api.server import app
from app.modules.alerts.bus import alert_bus, AlertBus
from app.modules.alerts.sse import generate_alert_stream
from app.worker.scheduler import (
    run_alert_evaluation_job,
    trigger_alert_check,
    alert_trigger_event,
)
from app.db.connection import read_cursor


@pytest.fixture
def test_db():
    src = Path(__file__).resolve().parent.parent / "data" / "ne_india.duckdb"
    tmp_dir = Path(tempfile.mkdtemp())
    dst = tmp_dir / "test_scheduler.duckdb"
    shutil.copy(src, dst)
    yield str(dst)
    shutil.rmtree(tmp_dir, ignore_errors=True)


def test_alert_bus_pub_sub():
    """Verify AlertBus subscription, publication, and cleanup."""
    bus = AlertBus()
    assert bus.subscriber_count == 0

    q = bus.subscribe()
    assert bus.subscriber_count == 1

    test_event = {"type": "alert", "key": "test:HIGH", "msg": "flood alert"}
    delivered = bus.publish(test_event)
    assert delivered == 1

    received = q.get_nowait()
    assert received == test_event

    bus.unsubscribe(q)
    assert bus.subscriber_count == 0


def test_alert_evaluation_records_cooldown(test_db):
    """Verify run_alert_evaluation_job populates alert_state table and respects cooldown."""
    async def _run():
        with read_cursor(test_db) as con:
            initial_count = con.execute("SELECT COUNT(*) FROM alert_state").fetchone()[0]

        # First evaluation cycle
        fired = await run_alert_evaluation_job(floor="WATCH", db_path=test_db)
        assert fired >= 0

        with read_cursor(test_db) as con:
            after_count = con.execute("SELECT COUNT(*) FROM alert_state").fetchone()[0]
            assert after_count >= initial_count

        # Second evaluation cycle within cooldown should fire 0 new alerts
        second_fired = await run_alert_evaluation_job(floor="WATCH", db_path=test_db)
        assert second_fired == 0

    asyncio.run(_run())


def test_alert_trigger_event():
    """Verify trigger_alert_check sets the global event flag."""
    alert_trigger_event.clear()
    assert not alert_trigger_event.is_set()

    trigger_alert_check()
    assert alert_trigger_event.is_set()
    alert_trigger_event.clear()


@pytest.mark.asyncio
async def test_persistent_sse_generator():
    """Verify generate_alert_stream yields snapshot, heartbeat, and live bus events."""
    alerts = [{"key": "test:WATCH", "target": "NH6", "risk": "WATCH"}]
    gen = generate_alert_stream(run_id=1, alerts=alerts, heartbeat_sec=0.1, follow=True, max_events=1)

    # 1. Snapshot event
    evt_snap = await anext(gen)
    assert "event: snapshot" in evt_snap

    # 2. Initial heartbeat
    evt_hb = await anext(gen)
    assert "event: heartbeat" in evt_hb

    # Publish an event on alert_bus
    alert_bus.publish({"key": "live:HIGH", "risk": "HIGH", "target": "NH27"})

    # 3. Live alert event
    evt_alert = await anext(gen)
    assert "event: alert" in evt_alert
    assert "live:HIGH" in evt_alert


def test_alerts_endpoint_schema_and_filter(test_db):
    """Verify GET /alerts returns validated AlertList model and supports corridor filtering."""
    client = TestClient(app)

    # General alerts query
    res = client.get("/alerts", params={"db": test_db, "floor": "WATCH"})
    assert res.status_code == 200
    data = res.json()
    assert "run_id" in data
    assert "floor" in data
    assert "alerts" in data
    assert isinstance(data["alerts"], list)

    if data["alerts"]:
        a0 = data["alerts"][0]
        assert "key" in a0
        assert "target" in a0
        assert "risk" in a0
        assert "action" in a0

    # Corridor-specific query
    res_corr = client.get("/alerts", params={"db": test_db, "floor": "WATCH", "corridor_id": 1})
    assert res_corr.status_code == 200
    data_corr = res_corr.json()
    for a in data_corr["alerts"]:
        assert a.get("corridor_id") in (1, None)
