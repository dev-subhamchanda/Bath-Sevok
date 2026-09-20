"""Alert cooldown state tracking and deduplication logic."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
import duckdb
from app.settings import settings
from app.db.queries import check_alert_cooldown, update_alert_state


def evaluate_alert_cooling(
    con: duckdb.DuckDBPyConnection,
    alert_key: str,
    current_level: str,
    now: datetime | None = None,
) -> Tuple[bool, bool]:
    """Check if an alert should fire or be suppressed by cooldown.
    
    Returns:
        should_fire (bool): True if new or escalated
        is_escalation (bool): True if severity increased from previous fire
    """
    now_utc = now or datetime.now(timezone.utc)
    prev_level, cd_until = check_alert_cooldown(con, alert_key)

    if prev_level is None:
        return True, False  # Brand new alert

    is_cooling = cd_until is not None and cd_until > now_utc
    if prev_level == current_level and is_cooling:
        return False, False  # Suppressed by cooldown

    is_escalation = prev_level != current_level
    return True, is_escalation


def record_alert_fire(
    con: duckdb.DuckDBPyConnection,
    alert_key: str,
    level: str,
    now: datetime | None = None,
) -> None:
    """Record that an alert has fired and set its cooldown window."""
    now_utc = now or datetime.now(timezone.utc)
    cd_until = now_utc + timedelta(hours=settings.alerts.cooldown_hours)
    update_alert_state(con, alert_key, level, now_utc.isoformat(), cd_until.isoformat())
