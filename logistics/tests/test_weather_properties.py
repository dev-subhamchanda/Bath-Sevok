"""Hypothesis property-based tests for meteorological classifications and weather profiles."""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from hypothesis import given, strategies as st
from app.modules.weather.metrics import (
    classify_visibility,
    classify_rain_rate,
    classify_rain_risk,
    calculate_accumulation,
    evaluate_weather,
)

VISIBILITY_SEVERITY = {
    "CLEAR": 1,
    "IMPAIRED": 2,
    "POOR_FOG": 3,
    "DENSE_FOG_HAZARD": 4,
}

RAIN_RATE_SEVERITY = {
    "DRY": 0,
    "LIGHT": 1,
    "MODERATE": 2,
    "HEAVY": 3,
    "TORRENTIAL_CLOUDBURST": 4,
}

RISK_SEVERITY = {
    "OK": 0,
    "WATCH": 1,
    "HIGH": 2,
    "CRITICAL": 3,
}


@given(
    vis_a=st.floats(min_value=0.0, max_value=20000.0),
    vis_b=st.floats(min_value=0.0, max_value=20000.0),
)
def test_prop_visibility_classification_monotonicity(vis_a: float, vis_b: float):
    """Property: Lower sight distance must always produce equal or higher hazard severity."""
    class_a = classify_visibility(vis_a)
    class_b = classify_visibility(vis_b)

    rank_a = VISIBILITY_SEVERITY[class_a]
    rank_b = VISIBILITY_SEVERITY[class_b]

    if vis_a <= vis_b:
        assert rank_a >= rank_b, f"vis_a={vis_a} ({class_a}) should be >= severity of vis_b={vis_b} ({class_b})"
    else:
        assert rank_a <= rank_b, f"vis_a={vis_a} ({class_a}) should be <= severity of vis_b={vis_b} ({class_b})"


@given(
    rain_a=st.floats(min_value=0.0, max_value=300.0),
    rain_b=st.floats(min_value=0.0, max_value=300.0),
)
def test_prop_rain_rate_monotonicity(rain_a: float, rain_b: float):
    """Property: Higher precipitation intensity must produce equal or higher rainfall severity."""
    class_a = classify_rain_rate(rain_a)
    class_b = classify_rain_rate(rain_b)

    rank_a = RAIN_RATE_SEVERITY[class_a]
    rank_b = RAIN_RATE_SEVERITY[class_b]

    if rain_a <= rain_b:
        assert rank_a <= rank_b, f"rain_a={rain_a} ({class_a}) should be <= severity of rain_b={rain_b} ({class_b})"
    else:
        assert rank_a >= rank_b, f"rain_a={rain_a} ({class_a}) should be >= severity of rain_b={rain_b} ({class_b})"


@given(
    precip_values=st.lists(
        st.one_of(st.none(), st.floats(min_value=0.0, max_value=50.0)),
        min_size=100,
        max_size=200,
    ),
    ref_hour=st.integers(min_value=72, max_value=90),
)
def test_prop_accumulation_temporal_nesting(precip_values: list[float | None], ref_hour: int):
    """Property: Since 24h is a sub-window of 72h, rain_3d >= rain_24h >= 0.0 must hold for non-negative inputs."""
    times = [
        f"2026-09-{10 + h // 24:02d}T{h % 24:02d}:00"
        for h in range(len(precip_values))
    ]
    ref_dt = times[ref_hour]

    r24, r3d, r7d = calculate_accumulation(times, precip_values, ref_dt)

    assert r24 >= 0.0, f"r24 must be non-negative: {r24}"
    assert r3d >= r24, f"r3d ({r3d}) must be >= r24 ({r24})"
    assert r7d >= 0.0, f"r7d must be non-negative: {r7d}"


@given(
    r24=st.floats(min_value=0.0, max_value=300.0),
    r3d_excess=st.floats(min_value=0.0, max_value=300.0),
    curr=st.floats(min_value=0.0, max_value=100.0),
)
def test_prop_rain_risk_monotonicity(r24: float, r3d_excess: float, curr: float):
    """Property: Increasing rainfall or intensity never decreases assigned risk level."""
    r3d = r24 + r3d_excess
    base_risk = classify_rain_risk(r24, r3d, curr)
    base_rank = RISK_SEVERITY[base_risk]

    # Increasing either parameter should not lower risk
    higher_r24 = r24 + 10.0
    higher_r3d = r3d + 10.0
    higher_curr = curr + 5.0

    elevated_risk = classify_rain_risk(higher_r24, higher_r3d, higher_curr)
    elevated_rank = RISK_SEVERITY[elevated_risk]

    assert elevated_rank >= base_rank, (
        f"Increasing rainfall cannot diminish risk: base={base_risk} ({base_rank}), elevated={elevated_risk} ({elevated_rank})"
    )


@given(
    n_legs=st.integers(min_value=2, max_value=10),
    base_vis=st.floats(min_value=100.0, max_value=10000.0),
    base_rain=st.floats(min_value=0.0, max_value=50.0),
    wind_gust=st.floats(min_value=5.0, max_value=80.0),
)
def test_prop_weather_summary_profile_invariants(
    n_legs: int,
    base_vis: float,
    base_rain: float,
    wind_gust: float,
):
    """Property: Synthesized weather summary bounds strictly encompass point and leg observations."""
    now_utc = datetime.now(timezone.utc)
    base_ts = now_utc.timestamp()
    timestamps = [base_ts + i * 3600.0 for i in range(48)]
    hourly_precip = [base_rain] * 48
    hourly_vis = [base_vis] * 48
    hourly_gusts = [wind_gust] * 48

    mock_grid = [
        {
            "_pre_parsed": True,
            "point_name": "Anchor Station",
            "lon": 92.0,
            "lat": 26.0,
            "times": [],
            "timestamps": timestamps,
            "precip": hourly_precip,
            "visibility": hourly_vis,
            "codes": [61 if base_rain > 0 else 0] * 48,
            "gusts": hourly_gusts,
            "rain_24h": base_rain * 24.0,
            "rain_3d": base_rain * 72.0,
            "current_rain_mm_h": base_rain,
            "current_visibility_m": base_vis,
            "current_wind_gust_kmh": wind_gust,
        }
    ]

    legs = [
        {
            "lon": 92.0 + i * 0.01,
            "lat": 26.0 + i * 0.01,
            "km_from_start": i * 15.0,
            "t_min_hours": i * 0.5,
            "t_max_hours": (i + 1) * 0.5,
            "elapsed_hours": i * 0.5 + 0.25,
        }
        for i in range(n_legs)
    ]

    summary = evaluate_weather(legs, mock_grid, now_utc)

    # Invariants accounting for 1-decimal / 2-decimal rounding tolerance
    assert summary["min_visibility_m"] <= base_vis + 0.1, "Summary min visibility must be <= point visibility"
    assert summary["max_rain_rate_mm_h"] >= base_rain - 0.05, "Summary max rain rate must be >= point rain rate"
    assert summary["max_wind_gust_kmh"] >= wind_gust - 0.1, "Summary max wind gust must be >= point wind gust"

    if base_rain >= 0.1:
        assert summary["has_active_rain"] is True, "Active rain flag must be set when rain >= 0.1 mm/h"
    elif base_rain < 0.05:
        assert summary["has_active_rain"] is False, "Active rain flag must be false when dry"
