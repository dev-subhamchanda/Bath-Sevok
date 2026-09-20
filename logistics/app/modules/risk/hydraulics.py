"""Physical and empirical open-channel hydraulic models and vehicle passability criteria.

Calculates channel depth, weir overtopping, critical closure discharge bounds,
subgrade soaking index, vehicle stability limits, and closure likelihood curves.
All discharge values operate in GloFAS v4 LISFLOOD reanalysis coordinates.
"""

from __future__ import annotations

import math
from typing import List, Dict, Any, Tuple
from app.enums import RiskLevel


def calc_bankfull_excess(q: float, rp2: float, rp5: float) -> float:
    """Normalized discharge excess above bankfull capacity (RP2) towards RP5.

    Returns:
        < 0.0: in-bank flow (roadway dry)
        0.0 to 1.0: overtopping regime between RP2 and RP5
        >= 1.0: 5-year severe overtopping
    """
    if rp5 <= 0.0:
        return 0.0
    if rp2 <= 0.0:
        rp2 = 0.60 * rp5

    delta = max(1.0, rp5 - rp2)
    return (q - rp2) / delta


def calc_bankfull_depth(rp2: float, terrain_class: str = "plain") -> float:
    """Estimate bankfull channel depth h_bf (meters) via empirical power law h = c * Q^e.

    Coefficients (0.45-0.52) and exponents (0.38-0.40) represent regional hydraulic priors.
    """
    if rp2 <= 0.0:
        return 3.0
    coeff = {"plain": 0.45, "rolling": 0.48, "mountain_ghat": 0.52}.get(terrain_class, 0.45)
    exp = {"plain": 0.38, "rolling": 0.39, "mountain_ghat": 0.40}.get(terrain_class, 0.38)
    return max(1.5, coeff * (max(1.0, rp2) ** exp))


def calc_inundation_depth(
    q: float,
    rp2: float,
    rp5: float,
    clearance_m: float = 0.0,
) -> float:
    """Broad-crested weir overtopping depth estimate (meters) above road clearance.

    At Q <= RP2: depth = 0.0 m.
    At Q = RP5: gross depth = 0.50 m.
    """
    if rp5 <= 0.0 or q <= 0.0:
        return 0.0
    if rp2 <= 0.0:
        rp2 = 0.60 * rp5
    if q <= rp2 or rp5 <= rp2:
        return 0.0
    excess_ratio = (q - rp2) / (rp5 - rp2)
    gross_depth = 0.50 * (excess_ratio ** (2.0 / 3.0))
    net_depth = max(0.0, gross_depth - clearance_m)
    return round(net_depth, 3)


from app.enums import RiskLevel, normalize_vehicle_profile

VEHICLE_HYDRAULIC_PROFILES: Dict[str, Dict[str, Any]] = {
    "light_commercial": {
        "d_crit": 0.25,
        "excess_hold": 0.40,
        "depth_hold": 0.25,
        "hazard_desc": "Light commercial vehicle limits exceeded: shallow approach ponding risks air intake hydrolock and loss of wheel traction",
        "caution_desc": "Light commercial vehicle caution: minor roadway overtopping",
        "gamma_v": 1.15,
    },
    "intermediate_truck": {
        "d_crit": 0.35,
        "excess_hold": 0.60,
        "depth_hold": 0.30,
        "hazard_desc": "Intermediate commercial truck limit exceeded: overtopping depth threatens air intake and chassis stability",
        "caution_desc": "Intermediate commercial truck caution: approach overtopping, proceed slowly",
        "gamma_v": 1.25,
    },
    "medium_truck": {
        "d_crit": 0.35,
        "excess_hold": 0.70,
        "depth_hold": 0.35,
        "hazard_desc": "Medium truck limit exceeded: advisory depth threatens air intake clearance",
        "caution_desc": "Medium truck caution: road overtopping ~ Proceed slowly",
        "gamma_v": 1.35,
    },
    "heavy_multi_axle": {
        "d_crit": 0.50,
        "excess_hold": 0.85,
        "depth_hold": 0.45,
        "hazard_desc": "Heavy truck near-RP5 hazard: advisory depth indicates high approach scour risk",
        "caution_desc": "Heavy truck caution: minor approach overtopping ~ Passable with caution",
        "gamma_v": 1.50,
    },
    "tractor_trailer": {
        "d_crit": 0.50,
        "excess_hold": 0.85,
        "depth_hold": 0.45,
        "hazard_desc": "Articulated tractor-trailer hazard: overtopping flow risks trailer articulation jackknifing and pavement subgrade scour",
        "caution_desc": "Articulated tractor-trailer caution: overtopping flow on deck, extreme caution required",
        "gamma_v": 1.60,
    },
    "tanker_empty": {
        "d_crit": 0.30,
        "excess_hold": 0.50,
        "depth_hold": 0.30,
        "hazard_desc": "Tanker buoyancy hazard: advisory depth risks lateral slide off causeway",
        "caution_desc": "Tanker caution: minor approach overtopping",
        "gamma_v": 1.65,
    },
    "tanker_laden": {
        "d_crit": 0.45,
        "excess_hold": 0.75,
        "depth_hold": 0.40,
        "hazard_desc": "Laden tanker liquid surge hazard: hydrodynamic drag combined with liquid sloshing threatens lateral roll stability",
        "caution_desc": "Laden tanker caution: road overtopping with cargo surge risk, proceed with crawl speed",
        "gamma_v": 1.55,
    },
    "high_mobility_4x4": {
        "d_crit": 0.90,
        "excess_hold": 0.95,
        "depth_hold": 0.75,
        "hazard_desc": "High-mobility 4x4 wading limit reached: water depth exceeds snorkel and waterproofed chassis depth rating",
        "caution_desc": "High-mobility 4x4 operating in deep overtopping flow: maintain engagement of 4WD low-range",
        "gamma_v": 1.20,
    },
    # Backward-compatible aliases
    "heavy_truck": {
        "d_crit": 0.50,
        "excess_hold": 0.85,
        "depth_hold": 0.45,
        "hazard_desc": "Heavy truck near-RP5 hazard: advisory depth indicates high approach scour risk",
        "caution_desc": "Heavy truck caution: minor approach overtopping ~ Passable with caution",
        "gamma_v": 1.50,
    },
    "tanker": {
        "d_crit": 0.30,
        "excess_hold": 0.50,
        "depth_hold": 0.30,
        "hazard_desc": "Tanker buoyancy hazard: advisory depth risks lateral slide off causeway",
        "caution_desc": "Tanker caution: minor approach overtopping",
        "gamma_v": 1.65,
    },
}


def calc_inversion_bounds(
    rp2: float,
    rp5: float,
    terrain_class: str = "plain",
    clearance_m: float = 0.0,
    vehicle_profile: str = "heavy_truck",
) -> Tuple[float, float, float]:
    """Calculate critical closure discharge Q_th and parameter sensitivity bounds [Q_min, Q_max].

    Formula:
        Q = RP2 * (1 + delta_h / h_bf) ** 1.67

    Regimes:
        1. mountain_ghat: Bed scour regime near bankfull.
           delta_h nominal = 0.15m, bounds [0.05m, 0.35m].
           h_bf carries +/- 25% sensitivity span.
        2. plain / rolling: Roadway overtopping regime.
           delta_h = freeboard + d_crit.
           Freeboard nominal: plain 0.60m, rolling 0.40m (+/- 0.15m span).
           Vehicle d_crit: determined dynamically from VEHICLE_HYDRAULIC_PROFILES.
           h_bf carries +/- 20% sensitivity span.
        3. Elevated viaduct (clearance_m >= 2.0m):
           Deck sits above extreme flood stage; returns inf.

    Returns:
        (q_th, q_min, q_max)
    """
    if clearance_m >= 2.0 or (rp2 <= 0.0 and rp5 <= 0.0):
        return float("inf"), float("inf"), float("inf")
    if rp2 <= 0.0:
        rp2 = 0.60 * rp5
    if rp5 <= rp2:
        rp5 = rp2 * 1.30

    h_bf = calc_bankfull_depth(rp2, terrain_class)

    if terrain_class == "mountain_ghat":
        delta_h_nominal = 0.15 + clearance_m
        q_th = rp2 * ((1.0 + delta_h_nominal / h_bf) ** 1.67)
        q_min = rp2 * ((1.0 + (0.05 + clearance_m) / (1.25 * h_bf)) ** 1.67)
        q_max = rp2 * ((1.0 + (0.35 + clearance_m) / (0.75 * h_bf)) ** 1.67)
    else:
        norm_v = normalize_vehicle_profile(vehicle_profile)
        spec = VEHICLE_HYDRAULIC_PROFILES.get(norm_v, VEHICLE_HYDRAULIC_PROFILES["heavy_multi_axle"])
        d_crit = spec.get("d_crit", 0.50)
        base_fb = {"plain": 0.60, "rolling": 0.40}.get(terrain_class, 0.50)
        z_fb = max(0.0, base_fb + clearance_m)
        q_th = rp2 * ((1.0 + (z_fb + d_crit) / h_bf) ** 1.67)

        fb_min = max(0.0, base_fb - 0.15 + clearance_m)
        fb_max = base_fb + 0.15 + clearance_m
        q_min = rp2 * ((1.0 + (fb_min + max(0.20, d_crit - 0.05)) / (1.20 * h_bf)) ** 1.67)
        q_max = rp2 * ((1.0 + (fb_max + d_crit + 0.05) / (0.80 * h_bf)) ** 1.67)

    return round(q_th, 2), round(q_min, 2), round(q_max, 2)


def calc_inversion_q(
    rp2: float,
    rp5: float,
    terrain_class: str = "plain",
    clearance_m: float = 0.0,
    vehicle_profile: str = "heavy_truck",
) -> float:
    """Return nominal critical closure discharge Q_th."""
    q_th, _, _ = calc_inversion_bounds(
        rp2=rp2,
        rp5=rp5,
        terrain_class=terrain_class,
        clearance_m=clearance_m,
        vehicle_profile=vehicle_profile,
    )
    return q_th


def calc_soaking_index(
    multi_day_q: List[float],
    rp2: float,
    rp5: float,
    eval_day: int = 0,
    terrain_class: str = "plain",
    dt_hours: float = 24.0,
) -> Tuple[float, float, bool]:
    """Compute cumulative embankment saturation index S(t) in units of [excess-days].

    Model:
        S(t) = sum_{tau=0}^{eval_day} max(0, (Q(tau) - RP2) / (RP5 - RP2)) * dt_days
    When Q < RP2:
        Tailwater drops below bankfull; gravity drainage decays saturation by 1.0 excess-day/day.

    Critical thresholds S_crit:
        plain: 2.0 excess-days
        rolling: 1.8 excess-days
        mountain_ghat: 1.5 excess-days

    Returns:
        (soak_index_days, s_crit, is_soaked)
    """
    s_crit = {"plain": 2.0, "rolling": 1.8, "mountain_ghat": 1.5}.get(terrain_class, 2.0)
    if not multi_day_q or rp5 <= rp2 or rp2 <= 0.0:
        return 0.0, s_crit, False

    dt_days = max(0.01, dt_hours / 24.0)
    delta_rp = max(1.0, rp5 - rp2)
    cutoff = min(len(multi_day_q), eval_day + 1)
    soak_sum = 0.0

    for tau in range(cutoff):
        q_tau = multi_day_q[tau]
        if q_tau > rp2:
            soak_sum += ((q_tau - rp2) / delta_rp) * dt_days
        else:
            soak_sum = max(0.0, soak_sum - 1.0 * dt_days)

    soak_sum = round(soak_sum, 3)
    is_soaked = soak_sum >= s_crit
    return soak_sum, s_crit, is_soaked


def evaluate_vehicle_risk(
    excess: float,
    load_ratio: float,
    vehicle_profile: str,
    p_rp5: float = 0.0,
    p_rp2: float = 0.0,
    base_risk: str = "OK",
    depth_m: float = 0.0,
    clearance_m: float = 0.0,
    allow_uncalibrated: bool = True,
) -> Tuple[str, str]:
    """Evaluate vehicle hydrodynamic stability and ground clearance under inundation.

    Returns:
        (risk_level, reason_string)
    """
    # 1. Elevated viaduct freeboard (clearance >= 2.0m)
    if clearance_m >= 2.0 and depth_m <= 0.0:
        if load_ratio >= 1.0 or excess >= 1.0 or p_rp5 >= 0.50:
            return (
                RiskLevel.WATCH.value,
                f"Elevated viaduct freeboard clear: Q >= RP5 flows beneath bridge deck ({clearance_m:.1f}m clearance), monitor approach scouring",
            )
        return RiskLevel.OK.value, f"Elevated viaduct freeboard clear: deck sits {clearance_m:.1f}m above river channel"

    # 2. Physical floor: Q >= RP5 on standard embankments or causeways
    if load_ratio >= 1.0 or excess >= 1.0:
        return (
            RiskLevel.HIGH.value,
            f"Physical floor exceeded: discharge >= RP5 (load_ratio={load_ratio:.2f}) ~ Highway approaches inundated (>0.50m depth)",
        )

    # 3. Overtopping regime (RP2 <= Q < RP5; 0.0 <= excess < 1.0)
    if excess >= 0.0:
        if not allow_uncalibrated:
            return (
                RiskLevel.WATCH.value,
                f"Overtopping regime (RP2 <= Q < RP5): bankfull excess={excess:.2f}, load_ratio={load_ratio:.2f} ~ Standard advisory (uncalibrated vehicle matrix gated)",
            )
        norm_v = normalize_vehicle_profile(vehicle_profile)
        spec = VEHICLE_HYDRAULIC_PROFILES.get(norm_v, VEHICLE_HYDRAULIC_PROFILES["heavy_multi_axle"])
        excess_hold = spec.get("excess_hold", 0.85)
        depth_hold = spec.get("depth_hold", 0.45)
        hazard_desc = spec.get("hazard_desc", "Vehicle overtopping safety limit exceeded")
        caution_desc = spec.get("caution_desc", "Vehicle caution: approach overtopping")

        if excess >= excess_hold or depth_m >= depth_hold:
            return (
                RiskLevel.HIGH.value,
                f"[UNCALIBRATED] {hazard_desc} (advisory depth {depth_m:.2f}m, excess={excess:.2f})",
            )
        return (
            RiskLevel.WATCH.value,
            f"[UNCALIBRATED] {caution_desc} (advisory depth {depth_m:.2f}m, excess={excess:.2f})",
        )

    # 4. In-bank regime (Q < RP2; excess < 0.0)
    if p_rp5 >= 0.50:
        return RiskLevel.HIGH.value, f"Forecast ensemble P(RP5)={p_rp5:.2f} indicates elevated flood risk"
    if p_rp5 >= 0.20 or p_rp2 >= 0.70 or base_risk in (RiskLevel.WATCH.value, RiskLevel.HIGH.value):
        effective = base_risk if base_risk != RiskLevel.OK.value else RiskLevel.WATCH.value
        return effective, f"Precautionary watch: P(RP5)={p_rp5:.2f}, P(RP2)={p_rp2:.2f}"

    return RiskLevel.OK.value, "Channel flow within bankfull capacity (roadway dry)"


def calc_closure_risk(
    q_mean: float,
    q_threshold: float,
    spread: float = 0.0,
    rp2: float = 0.0,
    rp5: float = 0.0,
    terrain_class: str = "plain",
    clearance_m: float = 0.0,
    vehicle_profile: str = "heavy_truck",
) -> Dict[str, Any]:
    """Calculate continuous closure likelihood in [0, 1] given discharge and threshold bounds.

    Evaluates a two-piece cumulative normal approximation centered at Q_th with
    left/right scales derived from sensitivity bounds [Q_min, Q_max] and aleatory spread.
    At Q = Q_th: closure_likelihood = 0.50.
    At Q <= Q_min: closure_likelihood <= 0.10.
    At Q >= Q_max: closure_likelihood >= 0.90.

    Returns:
        {
            "closure_likelihood": float,
            "q_threshold": float | None,
            "q_threshold_support": [float, float] | [None, None],
            "sigma_left": float,
            "sigma_right": float,
            "calibration_status": "UNCALIBRATED_HYPOTHESIS",
        }
    """
    if math.isinf(q_threshold):
        return {
            "closure_likelihood": 0.0,
            "q_threshold": None,
            "q_threshold_support": [None, None],
            "sigma_left": 0.0,
            "sigma_right": 0.0,
            "calibration_status": "UNCALIBRATED_HYPOTHESIS",
        }
    if q_threshold <= 0.0:
        val = 1.0 if q_mean > 0 else 0.0
        return {
            "closure_likelihood": val,
            "q_threshold": 0.0,
            "q_threshold_support": [0.0, 0.0],
            "sigma_left": 0.0,
            "sigma_right": 0.0,
            "calibration_status": "UNCALIBRATED_HYPOTHESIS",
        }

    if rp2 > 0.0 and rp5 > rp2:
        _, q_min, q_max = calc_inversion_bounds(
            rp2=rp2,
            rp5=rp5,
            terrain_class=terrain_class,
            clearance_m=clearance_m,
            vehicle_profile=vehicle_profile,
        )
        sigma_ep_l = max(2.0, (q_threshold - q_min) / 1.645)
        sigma_ep_r = max(2.0, (q_max - q_threshold) / 1.645)
        q_support = [q_min, q_max]
    else:
        sigma_ep_l = max(5.0, 0.08 * q_threshold)
        sigma_ep_r = max(5.0, 0.15 * q_threshold)
        q_support = [round(0.88 * q_threshold, 1), round(1.15 * q_threshold, 1)]

    sigma_al = max(0.0, spread / 1.282)
    sigma_eff_l = math.sqrt(sigma_ep_l ** 2 + sigma_al ** 2)
    sigma_eff_r = math.sqrt(sigma_ep_r ** 2 + sigma_al ** 2)

    if q_mean <= q_threshold:
        z = (q_mean - q_threshold) / max(1.0, sigma_eff_l)
    else:
        z = (q_mean - q_threshold) / max(1.0, sigma_eff_r)

    arg = max(-30.0, min(30.0, 1.70 * z))
    closure_likelihood = round(1.0 / (1.0 + math.exp(-arg)), 3)

    return {
        "closure_likelihood": closure_likelihood,
        "q_threshold": round(q_threshold, 1),
        "q_threshold_support": q_support,
        "sigma_left": round(sigma_eff_l, 2),
        "sigma_right": round(sigma_eff_r, 2),
        "calibration_status": "UNCALIBRATED_HYPOTHESIS",
    }
