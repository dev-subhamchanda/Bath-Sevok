"""Corridor and station flood evaluation logic."""

from __future__ import annotations

import asyncio
from typing import Dict, Any, List, Tuple
import aiohttp
import numpy as np
import duckdb

from app.enums import RiskLevel, Action, Trend, RISK_RANK, action_from_risk
from app.modules.flood.glofas import fetch_ensemble_forecast, extract_daily_members, extract_control_run
from app.modules.flood.statistics import compute_exceedance_probabilities, classify_flood_risk, analyze_hydrograph_wave


def load_station_thresholds(con: duckdb.DuckDBPyConnection, season: str = "annual") -> Dict[str, Dict[str, float]]:
    """Load calibrated return period thresholds from DuckDB."""
    thresholds: Dict[str, Dict[str, float]] = {}
    rows = con.execute(
        "SELECT station_name, rp_key, q_discharge FROM station_return_periods"
    ).fetchall()
    for st_name, rp_key, q in rows:
        thresholds.setdefault(st_name, {})[rp_key] = float(q)

    # Optional seasonal overrides
    if season in ("monsoon", "dry"):
        season_rows = con.execute(
            "SELECT station_name, rp_key, q_discharge FROM station_seasonal WHERE season = ?",
            [season],
        ).fetchall()
        for st_name, rp_key, q in season_rows:
            thresholds.setdefault(st_name, {})[rp_key] = float(q)

    return thresholds


async def assess_point_forecast(
    ensemble_json: Dict[str, Any],
    thresholds: Dict[str, float],
    forecast_days: int = 7,
) -> List[Dict[str, Any]]:
    """Evaluate a single coordinate across all 7 forecast days."""
    daily = ensemble_json.get("daily", {})
    daily_q_means = []
    daily_results = []

    for day in range(forecast_days):
        members = extract_daily_members(daily, day)
        q_ctrl = extract_control_run(daily, day)

        if not members:
            continue

        arr = np.array(members)
        q_mean = float(np.mean(arr))
        daily_q_means.append(q_mean)

        rp2 = thresholds.get("rp2", 0.0)
        rp5 = thresholds.get("rp5", 0.0)
        rp10 = thresholds.get("rp10", 0.0)

        probs = compute_exceedance_probabilities(members, rp2, rp5, rp10)
        risk = classify_flood_risk(probs, thresholds)

        daily_results.append({
            "day": day,
            "q_mean": q_mean,
            "q_control": q_ctrl,
            "q_p10": float(np.percentile(arr, 10)),
            "q_p50": float(np.percentile(arr, 50)),
            "q_p90": float(np.percentile(arr, 90)),
            "n_members": len(members),
            "p_rp2": probs["p_rp2"],
            "p_rp5": probs["p_rp5"],
            "p_rp10": probs["p_rp10"],
            "risk": risk,
            "rp2": rp2,
            "rp5": rp5,
            "rp10": rp10,
        })

    trend, peak_q, peak_day = analyze_hydrograph_wave(daily_q_means)
    for r in daily_results:
        r["trend"] = trend
        r["peak_q"] = peak_q
        r["peak_day"] = peak_day

    return daily_results
