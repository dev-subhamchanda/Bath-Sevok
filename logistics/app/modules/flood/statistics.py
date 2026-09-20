"""Hydrological statistics, exceedance probabilities, and hydrograph dynamics."""

from __future__ import annotations

from typing import List, Dict, Any, Tuple
import numpy as np
from app.enums import RiskLevel, Trend


def compute_exceedance_probabilities(
    members: list[float], rp2: float, rp5: float, rp10: float
) -> Dict[str, float]:
    """Calculate empirical exceedance probability across all 50 ensemble members."""
    if not members:
        return {"p_rp2": 0.0, "p_rp5": 0.0, "p_rp10": 0.0}
    arr = np.array(members)
    return {
        "p_rp2": float(np.mean(arr > rp2)) if rp2 > 0 else 0.0,
        "p_rp5": float(np.mean(arr > rp5)) if rp5 > 0 else 0.0,
        "p_rp10": float(np.mean(arr > rp10)) if rp10 > 0 else 0.0,
    }


def classify_flood_risk(probs: Dict[str, float], thresholds: Dict[str, float]) -> str:
    """Classify risk level from exceedance probabilities using the calibrated ladder."""
    if thresholds.get("rp10", 0) > 0 and probs.get("p_rp10", 0) > 0.5:
        return RiskLevel.CRITICAL.value
    if thresholds.get("rp5", 0) > 0 and probs.get("p_rp5", 0) > 0.5:
        return RiskLevel.HIGH.value
    if thresholds.get("rp2", 0) > 0 and probs.get("p_rp2", 0) > 0.5:
        return RiskLevel.WATCH.value
    return RiskLevel.OK.value


def analyze_hydrograph_wave(daily_q: List[float]) -> Tuple[str, float, int]:
    """Analyze forecast hydrograph waveform.
    
    Returns:
        trend: 'RISING', 'FALLING', or 'STABLE' based on local gradient
        peak_q: maximum forecast discharge over the horizon
        time_to_peak_days: day index when the peak occurs
    """
    if not daily_q or len(daily_q) < 2:
        return Trend.STABLE.value, 0.0, 0

    arr = np.array(daily_q)
    peak_q = float(np.max(arr))
    time_to_peak = int(np.argmax(arr))

    # Slope derivative over the immediate 48-hour window (Day 0 to Day 2)
    start_q = arr[0]
    next_q = arr[min(2, len(arr) - 1)]

    ratio = next_q / max(start_q, 1.0)
    if ratio > 1.15:
        trend = Trend.RISING.value
    elif ratio < 0.85:
        trend = Trend.FALLING.value
    else:
        trend = Trend.STABLE.value

    return trend, peak_q, time_to_peak
