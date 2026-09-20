"""Hypothesis property-based tests for hydrograph dynamics, exponential recession, and safe dispatch windows.

Literature References:
- Maillet, E. (1905). Essais d'hydraulique souterraine et fluviale. Librairie Scientifique A. Hermann.
- Barnes, B.S. (1939). The structure of discharge-recession curves. Eos, Transactions AGU, 20(4), 721-725.
- Chow, V.T. (1964). Handbook of Applied Hydrology. McGraw-Hill.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from hypothesis import given, strategies as st
from app.modules.risk.scorer import score_route_geometry, compute_dispatch_window
from app.enums import Verdict


@given(
    peak_q=st.floats(min_value=2500.0, max_value=5000.0),
    decay_k=st.floats(min_value=0.20, max_value=0.60),
    vehicle=st.sampled_from(["heavy_truck", "tanker", "medium_truck"]),
)
def test_prop_exponential_recession_dispatch(peak_q: float, decay_k: float, vehicle: str):
    """Property: Maillet exponential recession Q(t) = Q_0 * exp(-k*t) correctly identifies safe window."""
    rp2 = 1800.0
    rp5 = 2400.0
    points = [[92.80, 24.83], [92.81, 24.84]]
    crossings = [{"name": "Mahasadhu Bridge", "river": "Barak", "lon": 92.80, "lat": 24.83}]

    # Generate 7-day Maillet exponential recession hydrograph
    gauges_by_day = {}
    for day in range(7):
        # Q(t) decays exponentially from day 0 peak
        q_day = peak_q * math.exp(-decay_k * day)
        load_ratio = q_day / rp5
        gauges_by_day[day] = [{
            "gauge": "Silchar_gauge",
            "river": "Barak",
            "cell_lon": 92.825,
            "cell_lat": 24.825,
            "q_mean": q_day,
            "q_p50": q_day,
            "q_p90": q_day * 1.05,
            "rp2": rp2,
            "rp5": rp5,
            "load_ratio": round(load_ratio, 3),
            "p_rp2": 0.95 if q_day > rp2 else 0.05,
            "p_rp5": 0.90 if q_day > rp5 else 0.05,
            "p_rp10": 0.0,
            "trend": "FALLING",
            "risk": "HIGH" if q_day >= rp5 else "OK",
        }]

    scored_d0 = score_route_geometry(
        points=points,
        day=0,
        departure_day=0,
        gauges=gauges_by_day[0],
        crossings=crossings,
        gauges_by_day=gauges_by_day,
        vehicle_profile=vehicle,
    )

    if scored_d0["verdict"] == Verdict.HOLD.value:
        dw = scored_d0["dispatch_window"]
        assert dw is not None, "Dispatch window must be present when blocked"
        assert dw["is_receding"] is True, "Hydrograph is monotonically falling -> must be receding"

        safe_day = dw["safe_departure_day"]
        if safe_day is not None:
            # Mathematical Soundness Property:
            # Scoring on safe_day MUST be passable!
            scored_safe = score_route_geometry(
                points=points,
                day=safe_day,
                departure_day=safe_day,
                gauges=gauges_by_day[safe_day],
                crossings=crossings,
                gauges_by_day=gauges_by_day,
                vehicle_profile=vehicle,
            )
            assert scored_safe["is_passable"] is True, (
                f"Safe day {safe_day} must be passable, but got verdict {scored_safe['verdict']}"
            )
            assert dw["estimated_wait_hours"] == safe_day * 24.0


@given(
    base_q=st.floats(min_value=2600.0, max_value=4000.0),
    surge_rate=st.floats(min_value=1.05, max_value=1.30),
)
def test_prop_rising_hydrograph_no_window(base_q: float, surge_rate: float):
    """Property: A hydrograph that continually rises above RP5 must never emit a false safe departure window."""
    rp2 = 1800.0
    rp5 = 2400.0
    points = [[92.80, 24.83], [92.81, 24.84]]
    crossings = [{"name": "Mahasadhu Bridge", "river": "Barak", "lon": 92.80, "lat": 24.83}]

    # Monotonically rising flood wave
    gauges_by_day = {}
    for day in range(7):
        q_day = base_q * (surge_rate ** day)  # Strictly rising
        gauges_by_day[day] = [{
            "gauge": "Silchar_gauge",
            "river": "Barak",
            "cell_lon": 92.825,
            "cell_lat": 24.825,
            "q_mean": q_day,
            "q_p50": q_day,
            "q_p90": q_day * 1.1,
            "rp2": rp2,
            "rp5": rp5,
            "load_ratio": round(q_day / rp5, 3),
            "p_rp2": 0.99,
            "p_rp5": 0.95,
            "p_rp10": 0.80,
            "trend": "RISING",
            "risk": "HIGH",
        }]

    scored = score_route_geometry(
        points=points,
        day=0,
        departure_day=0,
        gauges=gauges_by_day[0],
        crossings=crossings,
        gauges_by_day=gauges_by_day,
        vehicle_profile="heavy_truck",
    )

    assert scored["verdict"] == Verdict.HOLD.value
    dw = scored["dispatch_window"]
    assert dw is not None
    assert dw["safe_departure_day"] is None, "Rising flood wave must have safe_departure_day == None"
    assert dw["estimated_wait_hours"] is None
    assert "recession" in dw["message"].lower() or "horizon" in dw["message"].lower()
