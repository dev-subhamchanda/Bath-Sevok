"""Open-Meteo multi-parameter weather client for route and corridor monitoring."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional

import httpx
from app.settings import settings
from app.modules.weather.metrics import calculate_accumulation, classify_rain_risk, classify_visibility

logger = logging.getLogger(__name__)

_WEATHER_FALLBACK = {
    "rain_24h": 0.0,
    "rain_3d": 0.0,
    "rain_7d_fcst": 0.0,
    "current_rain_mm_h": 0.0,
    "current_visibility_m": 10000.0,
    "current_wind_gust_kmh": 0.0,
    "hourly_precipitation": "[]",
    "hourly_visibility": "[]",
    "hourly_weather_code": "[]",
    "hourly_wind_gust": "[]",
    "hourly_time": "[]",
    "min_visibility_m": 10000.0,
    "max_wind_gust_kmh": 0.0,
    "risk": "OK",
}


async def fetch_cell_weather(
    client: httpx.AsyncClient, lon: float, lat: float
) -> Dict[str, Any]:
    """Fetch hourly weather parameters for a single cell (past days + forecast)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "precipitation,rain,weather_code,visibility,wind_speed_10m,wind_gusts_10m",
        "past_days": settings.weather.past_days,
        "forecast_days": settings.weather.forecast_days,
        "timezone": "UTC",
    }
    r = await client.get(settings.weather.api_url, params=params, timeout=30.0)
    r.raise_for_status()
    return r.json()


# Backward compatibility alias
fetch_cell_precipitation = fetch_cell_weather


def parse_weather_response(resp: Dict[str, Any], now_utc: Optional[str] = None) -> Dict[str, Any]:
    """Extract structured accumulations, current values, and hourly arrays from Open-Meteo response."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc).isoformat()
    
    hourly = resp.get("hourly", {})
    times = hourly.get("time", [])
    precip = hourly.get("precipitation", [])
    visibility = hourly.get("visibility", [])
    codes = hourly.get("weather_code", [])
    gusts = hourly.get("wind_gusts_10m", [])

    rain_24h, rain_3d, rain_7d = calculate_accumulation(times, precip, now_utc)

    # Locate current time index
    ref_norm = now_utc[:13] + ":00"
    cur_idx = len(times) - 1
    for i, t in enumerate(times):
        if t.startswith(ref_norm):
            cur_idx = i
            break

    current_rain = float(precip[cur_idx]) if cur_idx < len(precip) and precip[cur_idx] is not None else 0.0
    current_vis = float(visibility[cur_idx]) if cur_idx < len(visibility) and visibility[cur_idx] is not None else 10000.0
    current_gust = float(gusts[cur_idx]) if cur_idx < len(gusts) and gusts[cur_idx] is not None else 0.0

    # Lookahead extremes (next 48 hours from current index)
    lookahead_slice = slice(cur_idx, min(len(times), cur_idx + 48))
    future_vis = [float(v) for v in visibility[lookahead_slice] if v is not None]
    future_gust = [float(g) for g in gusts[lookahead_slice] if g is not None]

    min_vis = min(future_vis) if future_vis else current_vis
    max_gust = max(future_gust) if future_gust else current_gust

    risk = classify_rain_risk(rain_24h, rain_3d, current_rain)
    if min_vis < 150.0:
        risk = "CRITICAL"
    elif min_vis < 500.0 and risk == "OK":
        risk = "WATCH"

    return {
        "rain_24h": rain_24h,
        "rain_3d": rain_3d,
        "rain_7d_fcst": rain_7d,
        "current_rain_mm_h": round(current_rain, 2),
        "current_visibility_m": round(current_vis, 1),
        "current_wind_gust_kmh": round(current_gust, 1),
        "hourly_precipitation": json.dumps([p if p is not None else 0.0 for p in precip]),
        "hourly_visibility": json.dumps([v if v is not None else 10000.0 for v in visibility]),
        "hourly_weather_code": json.dumps([c if c is not None else 0 for c in codes]),
        "hourly_wind_gust": json.dumps([g if g is not None else 0.0 for g in gusts]),
        "hourly_time": json.dumps(times),
        "min_visibility_m": round(min_vis, 1),
        "max_wind_gust_kmh": round(max_gust, 1),
        "risk": risk,
    }


async def poll_gauge_weather(
    gauges: List[Dict[str, Any]]
) -> List[Tuple[str, float, float, float, str]]:
    """Concurrently poll precipitation for all gauge cells (legacy compatibility).
    
    Returns list of tuples: (gauge_name, rain_24h, rain_3d, rain_7d_fcst, risk).
    """
    now_utc = datetime.now(timezone.utc).isoformat()
    results = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [
            fetch_cell_weather(client, g["cell_lon"], g["cell_lat"])
            for g in gauges
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for g, resp in zip(gauges, responses):
            gauge_name = g["gauge"]
            if isinstance(resp, Exception):
                results.append((gauge_name, 0.0, 0.0, 0.0, "OK"))
                continue

            try:
                parsed = parse_weather_response(resp, now_utc)
                results.append((
                    gauge_name,
                    parsed["rain_24h"],
                    parsed["rain_3d"],
                    parsed["rain_7d_fcst"],
                    parsed["risk"],
                ))
            except Exception:
                results.append((gauge_name, 0.0, 0.0, 0.0, "OK"))

    return results


async def poll_weather_grid(
    points: List[Dict[str, Any]],
    max_concurrency: int = 10,
) -> List[Dict[str, Any]]:
    """Concurrently poll multi-parameter weather for monitoring points with spatial cell deduplication."""
    now_utc = datetime.now(timezone.utc).isoformat()
    
    # 1. Deduplicate by 0.1 degree spatial bucket (~11 km)
    unique_cells: Dict[Tuple[float, float], List[Dict[str, Any]]] = {}
    for p in points:
        lon_key = round(float(p["lon"]), 1)
        lat_key = round(float(p["lat"]), 1)
        key = (lon_key, lat_key)
        if key not in unique_cells:
            unique_cells[key] = []
        unique_cells[key].append(p)

    cell_results: Dict[Tuple[float, float], Dict[str, Any]] = {}
    semaphore = asyncio.Semaphore(max_concurrency)

    async def _fetch_cell(client: httpx.AsyncClient, lon: float, lat: float) -> Tuple[Tuple[float, float], Any]:
        async with semaphore:
            try:
                resp = await fetch_cell_weather(client, lon, lat)
                return (lon, lat), resp
            except Exception as e:
                logger.warning(f"Weather fetch failed for ({lon}, {lat}): {e}")
                return (lon, lat), e

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [
            _fetch_cell(client, cell_lon, cell_lat)
            for (cell_lon, cell_lat) in unique_cells.keys()
        ]
        fetched = await asyncio.gather(*tasks)
        for key, resp in fetched:
            if isinstance(resp, Exception):
                cell_results[key] = dict(_WEATHER_FALLBACK)
            else:
                try:
                    cell_results[key] = parse_weather_response(resp, now_utc)
                except Exception:
                    cell_results[key] = dict(_WEATHER_FALLBACK)

    # Assign results back to individual points
    output_rows = []
    for key, mapped_points in unique_cells.items():
        w_data = cell_results[key]
        for p in mapped_points:
            row = dict(p)
            row.update(w_data)
            output_rows.append(row)

    return output_rows
