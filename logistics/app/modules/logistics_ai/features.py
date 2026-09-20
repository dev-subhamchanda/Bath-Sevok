"""Feature vector extraction for downstream ML/RL dispatch models.

Maintains an immutable contract: downstream models can escalate risk, but are
clamped to physics_floor established by calibrated hydrological thresholds.
"""

from __future__ import annotations

from typing import Dict, Any, List
from app.enums import RISK_RANK


def extract_route_features(scored_route: Dict[str, Any]) -> Dict[str, Any]:
    """Compute flat numerical feature vector from route legs.
    
    Preserves exact contract expected by ML models and /features endpoint.
    """
    legs = scored_route.get("legs", [])
    n = len(legs)
    if n == 0:
        return {
            "n_legs": 0,
            "frac_watch": 0.0,
            "frac_hold": 0.0,
            "max_p_rp5": 0.0,
            "mean_p_rp5": 0.0,
            "max_load_ratio": 0.0,
            "max_spread": 0.0,
            "frac_rising": 0.0,
            "min_gauge_km": -1.0,
            "n_segments": 0,
            "physics_verdict": "GO",
            "physics_floor": "GO",
        }

    watch_count = sum(1 for leg in legs if RISK_RANK.get(leg.get("risk", "OK"), 0) >= RISK_RANK["WATCH"])
    hold_count = sum(1 for leg in legs if RISK_RANK.get(leg.get("risk", "OK"), 0) >= RISK_RANK["HIGH"])
    rising_count = sum(1 for leg in legs if leg.get("trend") == "RISING")

    p_rp5_vals = [leg.get("p_rp5", 0.0) or 0.0 for leg in legs]
    load_ratios = [leg.get("load_ratio", 0.0) or 0.0 for leg in legs]
    spreads = [(leg.get("q_p90", 0.0) or 0.0) - (leg.get("q_p50", 0.0) or 0.0) for leg in legs]
    gauge_kms = [leg.get("gauge_km", 999.0) for leg in legs if leg.get("gauge_km") is not None]
    segments_seen = {leg["segment"] for leg in legs if leg.get("segment")}

    verdict = scored_route.get("verdict", "GO")

    return {
        "n_legs": n,
        "frac_watch": round(watch_count / n, 3),
        "frac_hold": round(hold_count / n, 3),
        "max_p_rp5": round(max(p_rp5_vals, default=0.0), 4),
        "mean_p_rp5": round(sum(p_rp5_vals) / n, 4),
        "max_load_ratio": round(max(load_ratios, default=0.0), 3),
        "max_spread": round(max(spreads, default=0.0), 1),
        "frac_rising": round(rising_count / n, 3),
        "min_gauge_km": round(min(gauge_kms, default=-1.0), 1),
        "n_segments": len(segments_seen),
        "physics_verdict": verdict,
        "physics_floor": verdict,
    }
