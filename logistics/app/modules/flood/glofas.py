"""Async client for Open-Meteo GloFAS v4 ensemble forecasts."""

from __future__ import annotations

import asyncio
from typing import Dict, Any, List
import aiohttp
from app.settings import settings


async def fetch_ensemble_forecast(
    session: aiohttp.ClientSession,
    lon: float,
    lat: float,
    forecast_days: int = 7,
) -> Dict[str, Any]:
    """Fetch 50-member ensemble river discharge forecast for one coordinate."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "river_discharge",
        "forecast_days": forecast_days,
        "ensemble": "true",
    }
    async with session.get(settings.flood.api_url, params=params) as resp:
        resp.raise_for_status()
        return await resp.json()


def extract_daily_members(daily_data: Dict[str, Any], day_idx: int) -> List[float]:
    """Extract all member values for a specific forecast day."""
    values = []
    for k in sorted(daily_data):
        if "member" not in k:
            continue
        vals = daily_data.get(k, [])
        if vals and len(vals) > day_idx and vals[day_idx] is not None:
            values.append(float(vals[day_idx]))
    return values


def extract_control_run(daily_data: Dict[str, Any], day_idx: int) -> float:
    """Extract deterministic control run value for a specific forecast day."""
    ctrl = daily_data.get("river_discharge", [])
    if ctrl and len(ctrl) > day_idx and ctrl[day_idx] is not None:
        return float(ctrl[day_idx])
    return 0.0
