"""Hypothesis property-based tests for roadway weir hydraulics and vehicle flood stability.

Literature References:
- Henderson, F.M. (1966). Open Channel Flow. Macmillan.
- FHWA HDS-5 / HEC-14: Hydraulic Design of Highway Culverts and Roadway Overtopping.
- Xia, J., Falconer, R.A., Wang, Y., & Xiao, X. (2014). Experimental and numerical study
  of vehicle stability in floodwaters. Water Resources Research, 50(2), 990-1006.
- Smith, G.P., Davey, E.K., & Cox, R.J. (2017). Appropriate safety criteria for vehicles
  in floods. Australian Rainfall & Runoff (ARR) Project 10.
"""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from hypothesis import given, strategies as st
from app.modules.risk.hydraulics import (
    calc_bankfull_excess,
    calc_inundation_depth,
    evaluate_vehicle_risk,
    calc_bankfull_depth,
    calc_inversion_q,
    calc_inversion_bounds,
    calc_soaking_index,
    calc_closure_risk,
)
from app.enums import RiskLevel, RISK_RANK


# ---------------------------------------------------------------------------
# 1. Broad-Crested Roadway Weir Hydraulics Properties (Henderson 1966)
# ---------------------------------------------------------------------------

@given(
    rp2=st.floats(min_value=100.0, max_value=20000.0),
    rp5_mult=st.floats(min_value=1.1, max_value=3.0),
    q_mult=st.floats(min_value=0.0, max_value=0.999),
)
def test_prop_bankfull_invariance(rp2: float, rp5_mult: float, q_mult: float):
    """Property: Any discharge below bankfull capacity (Q <= RP2) produces zero inundation depth."""
    rp5 = rp2 * rp5_mult
    q = rp2 * q_mult
    excess = calc_bankfull_excess(q, rp2, rp5)
    depth = calc_inundation_depth(q, rp2, rp5)

    assert excess <= 0.0, f"Excess must be <= 0 for Q <= RP2, got {excess}"
    assert depth == 0.0, f"Pavement must be dry (depth == 0) for in-bank flow, got {depth}"


@given(
    rp2=st.floats(min_value=100.0, max_value=20000.0),
    rp5_mult=st.floats(min_value=1.1, max_value=3.0),
)
def test_prop_design_overtopping_depth(rp2: float, rp5_mult: float):
    """Property: At exactly Q = RP5, inundation depth reaches 0.50m (500mm design overtopping)."""
    rp5 = rp2 * rp5_mult
    excess = calc_bankfull_excess(rp5, rp2, rp5)
    depth = calc_inundation_depth(rp5, rp2, rp5)

    assert abs(excess - 1.0) < 1e-3, f"Excess at RP5 must be 1.0, got {excess}"
    assert abs(depth - 0.50) < 1e-3, f"Depth at RP5 must be 0.50m, got {depth}"


@given(
    rp2=st.floats(min_value=100.0, max_value=10000.0),
    rp5_mult=st.floats(min_value=1.1, max_value=2.5),
    delta_q=st.floats(min_value=1.0, max_value=5000.0),
    step=st.floats(min_value=1.0, max_value=500.0),
)
def test_prop_weir_depth_monotonicity(rp2: float, rp5_mult: float, delta_q: float, step: float):
    """Property: For Q >= RP2, water depth on road h(Q) is strictly monotonic non-decreasing."""
    rp5 = rp2 * rp5_mult
    q1 = rp2 + delta_q
    q2 = q1 + step

    depth1 = calc_inundation_depth(q1, rp2, rp5)
    depth2 = calc_inundation_depth(q2, rp2, rp5)

    assert depth2 >= depth1, f"Weir depth must be non-decreasing: h({q2})={depth2} < h({q1})={depth1}"
    assert depth1 > 0.0, "Depth must be positive for Q > RP2"


# ---------------------------------------------------------------------------
# 2. Vehicle Stability Hierarchy Properties (Xia et al. 2014 & ARR Project 10)
# ---------------------------------------------------------------------------

@given(
    excess=st.floats(min_value=-0.5, max_value=2.0),
    load_ratio=st.floats(min_value=0.0, max_value=2.0),
    depth_m=st.floats(min_value=0.0, max_value=1.0),
)
def test_prop_vehicle_stability_hierarchy(excess: float, load_ratio: float, depth_m: float):
    """Property: Severity(Tanker) >= Severity(MCV) >= Severity(HCV) holds for all hydraulic states."""
    tanker_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="tanker", depth_m=depth_m
    )
    mcv_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="medium_truck", depth_m=depth_m
    )
    hcv_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="heavy_truck", depth_m=depth_m
    )

    t_rank = RISK_RANK[tanker_risk]
    m_rank = RISK_RANK[mcv_risk]
    h_rank = RISK_RANK[hcv_risk]

    # Tanker is most vulnerable due to buoyancy; HCV is most stable due to 16T+ axle loading
    assert t_rank >= m_rank, (
        f"Tanker ({tanker_risk}={t_rank}) must be >= MCV ({mcv_risk}={m_rank}) "
        f"at excess={excess}, depth={depth_m}"
    )
    assert m_rank >= h_rank, (
        f"MCV ({mcv_risk}={m_rank}) must be >= HCV ({hcv_risk}={h_rank}) "
        f"at excess={excess}, depth={depth_m}"
    )


@given(
    load_ratio=st.floats(min_value=1.0, max_value=5.0),
    excess=st.floats(min_value=1.0, max_value=5.0),
    vehicle=st.sampled_from(["heavy_truck", "tanker", "medium_truck"]),
    p_rp5=st.floats(min_value=0.0, max_value=1.0),
    p_rp2=st.floats(min_value=0.0, max_value=1.0),
)
def test_prop_physical_floor_invariance(
    load_ratio: float, excess: float, vehicle: str, p_rp5: float, p_rp2: float
):
    """Property: Whenever Q >= RP5 (load_ratio >= 1.0 or excess >= 1.0), risk is unconditionally HIGH."""
    risk, reason = evaluate_vehicle_risk(
        excess=excess,
        load_ratio=load_ratio,
        vehicle_profile=vehicle,
        p_rp5=p_rp5,
        p_rp2=p_rp2,
        base_risk="OK",
        depth_m=0.50,
    )
    assert risk == RiskLevel.HIGH.value, f"Physical floor must force HIGH at excess={excess}, got {risk}"
    assert "floor" in reason.lower() or "rp5" in reason.lower()


@given(
    excess=st.floats(min_value=0.50, max_value=0.69),
    depth_m=st.floats(min_value=0.30, max_value=0.34),
)
def test_prop_tanker_buoyancy_window(excess: float, depth_m: float):
    """Property: In the range [0.50, 0.70) excess (depth ~300-340mm), Tanker holds but MCV/HCV caution."""
    t_risk, t_reason = evaluate_vehicle_risk(
        excess=excess, load_ratio=0.85, vehicle_profile="tanker", depth_m=depth_m
    )
    m_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=0.85, vehicle_profile="medium_truck", depth_m=depth_m
    )
    h_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=0.85, vehicle_profile="heavy_truck", depth_m=depth_m
    )

    assert t_risk == RiskLevel.HIGH.value, f"Tanker must be HIGH at excess={excess}, got {t_risk}"
    assert "buoyancy" in t_reason.lower() or "slide" in t_reason.lower()
    assert m_risk == RiskLevel.WATCH.value, f"MCV should be WATCH at excess={excess}, got {m_risk}"
    assert h_risk == RiskLevel.WATCH.value, f"HCV should be WATCH at excess={excess}, got {h_risk}"


@given(
    rp2=st.floats(min_value=1000.0, max_value=20000.0),
    rp5_mult=st.floats(min_value=1.2, max_value=2.5),
    q_mult=st.floats(min_value=1.0, max_value=2.0),
    vehicle=st.sampled_from(["heavy_truck", "tanker", "medium_truck"]),
)
def test_prop_elevated_viaduct_invariance(rp2: float, rp5_mult: float, q_mult: float, vehicle: str):
    """Property: An elevated viaduct (clearance >= 2.0m) maintains zero deck inundation and never triggers overtopping HOLD."""
    rp5 = rp2 * rp5_mult
    q = rp5 * q_mult
    excess = calc_bankfull_excess(q, rp2, rp5)
    depth = calc_inundation_depth(q, rp2, rp5, clearance_m=3.0)

    assert depth == 0.0, f"Elevated viaduct deck must remain dry, got depth={depth}m"

    risk, reason = evaluate_vehicle_risk(
        excess=excess,
        load_ratio=q / rp5,
        vehicle_profile=vehicle,
        p_rp5=0.80,
        p_rp2=0.99,
        base_risk="OK",
        depth_m=depth,
        clearance_m=3.0,
    )

    assert risk != RiskLevel.HIGH.value, f"Elevated viaduct must not HOLD, got {risk}: {reason}"
    assert "viaduct" in reason.lower()


@given(
    rp2=st.floats(min_value=1000.0, max_value=20000.0),
    rp5_mult=st.floats(min_value=1.2, max_value=2.5),
    delta_q=st.floats(min_value=10.0, max_value=5000.0),
)
def test_prop_causeway_earlier_submergence(rp2: float, rp5_mult: float, delta_q: float):
    """Property: A flush causeway (clearance 0.0m) always has water depth >= standard embanked bridge (clearance 0.30m)."""
    rp5 = rp2 * rp5_mult
    q = rp2 + delta_q

    depth_causeway = calc_inundation_depth(q, rp2, rp5, clearance_m=0.0)
    depth_embankment = calc_inundation_depth(q, rp2, rp5, clearance_m=0.30)

    assert depth_causeway >= depth_embankment, (
        f"Causeway depth ({depth_causeway}m) must be >= embankment depth ({depth_embankment}m) at Q={q}"
    )


@given(
    excess=st.floats(min_value=0.0, max_value=0.99),
    load_ratio=st.floats(min_value=0.60, max_value=0.99),
    vehicle=st.sampled_from(["heavy_truck", "medium_truck", "tanker"]),
    depth_m=st.floats(min_value=0.01, max_value=0.49),
)
def test_prop_uncalibrated_vehicle_matrix_gate(
    excess: float, load_ratio: float, vehicle: str, depth_m: float
):
    """Property: Gating uncalibrated vehicle matrix prevents false-precision differentiation."""
    # When allow_uncalibrated=False: uniform advisory WATCH, no vehicle split
    risk_gated, reason_gated = evaluate_vehicle_risk(
        excess=excess,
        load_ratio=load_ratio,
        vehicle_profile=vehicle,
        p_rp5=0.10,
        p_rp2=0.50,
        base_risk="OK",
        depth_m=depth_m,
        allow_uncalibrated=False,
    )
    assert risk_gated == RiskLevel.WATCH.value
    assert "uncalibrated vehicle matrix gated" in reason_gated

    # When allow_uncalibrated=True: outputs explicitly carry [UNCALIBRATED] tag
    risk_ungated, reason_ungated = evaluate_vehicle_risk(
        excess=excess,
        load_ratio=load_ratio,
        vehicle_profile=vehicle,
        p_rp5=0.10,
        p_rp2=0.50,
        base_risk="OK",
        depth_m=depth_m,
        allow_uncalibrated=True,
    )
    assert "[UNCALIBRATED]" in reason_ungated


# ---------------------------------------------------------------------------
# 4. Four-Pillar Hydraulic Inversion, Soaking, and Fragility Properties
# ---------------------------------------------------------------------------

@given(
    rp2=st.floats(min_value=200.0, max_value=25000.0),
    rp5_mult=st.floats(min_value=1.15, max_value=2.5),
    terrain=st.sampled_from(["plain", "rolling"]),
    clearance=st.floats(min_value=0.0, max_value=0.50),
)
def test_prop_hydraulic_inversion_monotonicity(
    rp2: float, rp5_mult: float, terrain: str, clearance: float
):
    """Property: In alluvial overtopping regimes (plain, rolling), Q_th is strictly monotonic with vehicle clearance and always > RP2."""
    rp5 = rp2 * rp5_mult
    q_tanker = calc_inversion_q(rp2, rp5, terrain, clearance, "tanker")
    q_mcv = calc_inversion_q(rp2, rp5, terrain, clearance, "medium_truck")
    q_hcv = calc_inversion_q(rp2, rp5, terrain, clearance, "heavy_truck")

    # Invariants:
    # 1. Higher vehicle clearance strictly increases Q_th
    assert q_tanker < q_mcv < q_hcv, f"Failed hierarchy: {q_tanker} < {q_mcv} < {q_hcv}"
    # 2. Closure threshold must exceed bankfull capacity
    assert q_tanker > rp2, f"Tanker Q_th {q_tanker} must be > RP2 {rp2}"
    # 3. Structural clearance strictly increases threshold
    q_higher_clearance = calc_inversion_q(rp2, rp5, terrain, clearance + 0.30, "heavy_truck")
    assert q_higher_clearance > q_hcv


@given(
    rp2=st.floats(min_value=100.0, max_value=10000.0),
    rp5_mult=st.floats(min_value=1.15, max_value=2.5),
    clearance=st.floats(min_value=0.0, max_value=0.50),
)
def test_prop_ghat_scour_regime(rp2: float, rp5_mult: float, clearance: float):
    """Property: In mountain ghats, failure is governed by hydrodynamic canyon scour near bankfull, independent of vehicle profile."""
    rp5 = rp2 * rp5_mult
    q_tanker = calc_inversion_q(rp2, rp5, "mountain_ghat", clearance, "tanker")
    q_mcv = calc_inversion_q(rp2, rp5, "mountain_ghat", clearance, "medium_truck")
    q_hcv = calc_inversion_q(rp2, rp5, "mountain_ghat", clearance, "heavy_truck")

    # Invariants:
    # 1. Canyon scour is independent of vehicle draft/buoyancy
    assert q_tanker == q_mcv == q_hcv, f"Ghat scour Q_th must be vehicle-independent: {q_tanker}, {q_mcv}, {q_hcv}"
    # 2. Scour threshold is strictly above bankfull
    assert q_tanker > rp2, f"Ghat Q_th {q_tanker} must be > bankfull RP2 {rp2}"
    # 3. For zero clearance, Q_th is bounded close to bankfull (1.01 to 1.15 * RP2)
    q_zero_cl = calc_inversion_q(rp2, rp5, "mountain_ghat", 0.0, "heavy_truck")
    assert rp2 < q_zero_cl <= 1.15 * rp2, f"Zero-clearance ghat Q_th {q_zero_cl} out of near-bankfull bounds for RP2 {rp2}"


@given(
    rp2=st.floats(min_value=200.0, max_value=5000.0),
    rp5_mult=st.floats(min_value=1.2, max_value=2.0),
    excess_fraction=st.floats(min_value=0.1, max_value=2.0),
)
def test_prop_soaking_timestep_invariance(
    rp2: float, rp5_mult: float, excess_fraction: float
):
    """Property: Cumulative soaking index is timestep-invariant between daily (dt=24h) and hourly (dt=1h) intervals."""
    rp5 = rp2 * rp5_mult
    q_const = rp2 + excess_fraction * (rp5 - rp2)

    # 1. Single daily step (dt = 24.0h)
    daily_q = [q_const]
    s_daily, _, _ = calc_soaking_index(daily_q, rp2, rp5, eval_day=0, dt_hours=24.0)

    # 2. 24 hourly steps representing the identical continuous period (dt = 1.0h)
    hourly_q = [q_const] * 24
    s_hourly, _, _ = calc_soaking_index(hourly_q, rp2, rp5, eval_day=23, dt_hours=1.0)

    assert abs(s_daily - s_hourly) < 1e-2, (
        f"Timestep invariance violated: daily S={s_daily} != hourly S={s_hourly} for excess={excess_fraction}"
    )



@given(
    rp2=st.floats(min_value=200.0, max_value=25000.0),
    rp5_mult=st.floats(min_value=1.15, max_value=2.5),
    clearance=st.floats(min_value=0.0, max_value=0.40),
    vehicle=st.sampled_from(["heavy_truck", "medium_truck", "tanker"]),
)
def test_prop_terrain_geomorphic_ordering(
    rp2: float, rp5_mult: float, clearance: float, vehicle: str
):
    """Property: Mountain ghats fail at lower discharge than alluvial plains due to narrow canyon scour."""
    rp5 = rp2 * rp5_mult
    q_ghat = calc_inversion_q(rp2, rp5, "mountain_ghat", clearance, vehicle)
    q_rolling = calc_inversion_q(rp2, rp5, "rolling", clearance, vehicle)
    q_plain = calc_inversion_q(rp2, rp5, "plain", clearance, vehicle)

    assert q_ghat < q_rolling < q_plain, f"Expected ghat < rolling < plain, got {q_ghat} < {q_rolling} < {q_plain}"


@given(
    rp2=st.floats(min_value=500.0, max_value=5000.0),
    rp5_mult=st.floats(min_value=1.2, max_value=2.0),
    terrain=st.sampled_from(["plain", "rolling", "mountain_ghat"]),
)
def test_prop_soaking_index_saturation_override(
    rp2: float, rp5_mult: float, terrain: str
):
    """Property: Multi-day continuous high water saturates the embankment and drains when stage recedes."""
    rp5 = rp2 * rp5_mult
    # Case 1: 3 consecutive days at RP5 produces severe saturation exceeding S_crit
    high_flow = [rp5, rp5, rp5, rp5]
    s_val, s_crit, is_soaked = calc_soaking_index(high_flow, rp2, rp5, eval_day=3, terrain_class=terrain)
    assert is_soaked is True, f"3+ days at RP5 must saturate embankment: S={s_val}, Scrit={s_crit}"
    assert s_val >= s_crit

    # Case 2: Water receding below RP2 triggers gravity drainage
    drained_flow = [rp5, rp5, rp2 * 0.5, rp2 * 0.5]
    s_drained, _, _ = calc_soaking_index(drained_flow, rp2, rp5, eval_day=3, terrain_class=terrain)
    assert s_drained < s_val, f"Drainage days must reduce soaking index from {s_val} to {s_drained}"


@given(
    q_th=st.floats(min_value=500.0, max_value=10000.0),
    spread_ratio=st.floats(min_value=0.0, max_value=0.50),
)
def test_prop_fragility_monotonicity(q_th: float, spread_ratio: float):
    """Property: Closure likelihood is strictly monotonic with discharge."""
    spread = q_th * spread_ratio
    p_low = calc_closure_risk(q_th * 0.3, q_th, spread=spread)["closure_likelihood"]
    p_mid = calc_closure_risk(q_th, q_th, spread=spread)["closure_likelihood"]
    p_high = calc_closure_risk(q_th * 1.7, q_th, spread=spread)["closure_likelihood"]

    # 1. Monotonicity
    assert p_low <= p_mid <= p_high
    # 2. Symmetry at threshold
    assert abs(p_mid - 0.50) <= 0.01, f"Closure likelihood at threshold must be ~0.50, got {p_mid}"
    # 3. Extremes
    assert p_low < 0.10, f"Low flow must have low closure likelihood, got {p_low}"
    assert p_high > 0.90, f"High flow must have high closure likelihood, got {p_high}"


@given(
    rp2=st.floats(min_value=200.0, max_value=20000.0),
    rp5_mult=st.floats(min_value=1.15, max_value=2.5),
    terrain=st.sampled_from(["plain", "rolling", "mountain_ghat"]),
    clearance=st.floats(min_value=0.0, max_value=0.50),
    vehicle=st.sampled_from(["heavy_truck", "medium_truck", "tanker"]),
)
def test_prop_tri_state_support_ordering(
    rp2: float, rp5_mult: float, terrain: str, clearance: float, vehicle: str
):
    """Property: Physical parameter support bounds satisfy RP2 < Q_min <= Q_th <= Q_max and induce valid split-normal closure likelihood."""
    rp5 = rp2 * rp5_mult
    q_th, q_min, q_max = calc_inversion_bounds(
        rp2, rp5, terrain, clearance, vehicle
    )

    # 1. Structural support ordering: Q_min <= Q_th <= Q_max
    assert rp2 < q_min <= q_th <= q_max, f"Violated support ordering: RP2={rp2} < {q_min} <= {q_th} <= {q_max}"

    # 2. Split-normal likelihood score calibration
    assessment_mid = calc_closure_risk(
        q_mean=q_th,
        q_threshold=q_th,
        spread=0.0,
        rp2=rp2,
        rp5=rp5,
        terrain_class=terrain,
        clearance_m=clearance,
        vehicle_profile=vehicle,
    )
    assert abs(assessment_mid["closure_likelihood"] - 0.50) <= 0.01

    assessment_low = calc_closure_risk(
        q_mean=q_min,
        q_threshold=q_th,
        spread=0.0,
        rp2=rp2,
        rp5=rp5,
        terrain_class=terrain,
        clearance_m=clearance,
        vehicle_profile=vehicle,
    )
    assert assessment_low["closure_likelihood"] <= 0.10

    assessment_high = calc_closure_risk(
        q_mean=q_max,
        q_threshold=q_th,
        spread=0.0,
        rp2=rp2,
        rp5=rp5,
        terrain_class=terrain,
        clearance_m=clearance,
        vehicle_profile=vehicle,
    )
    assert assessment_high["closure_likelihood"] >= 0.90


