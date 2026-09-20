"""Tests for expanded realistic vehicle profiles and hydrodynamic stability hierarchy.

Validates:
- 8 realistic vehicle profiles: light_commercial, intermediate_truck, medium_truck,
  heavy_multi_axle, tractor_trailer, tanker_empty, tanker_laden, high_mobility_4x4.
- Backward-compatible legacy aliases: heavy_truck -> heavy_multi_axle, tanker -> tanker_empty.
- Relative stability hierarchy and mechanical limit states.
"""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from app.enums import RiskLevel, Verdict, normalize_vehicle_profile, VehicleProfile
from app.modules.risk.hydraulics import (
    evaluate_vehicle_risk,
    calc_inversion_bounds,
    VEHICLE_HYDRAULIC_PROFILES,
)
from app.modules.risk.scorer import score_route_geometry


def test_vehicle_profile_normalization():
    """Verify legacy aliases normalize to canonical VehicleProfile values."""
    assert normalize_vehicle_profile("heavy_truck") == VehicleProfile.HEAVY_MULTI_AXLE.value
    assert normalize_vehicle_profile("tanker") == VehicleProfile.TANKER_EMPTY.value
    assert normalize_vehicle_profile("light_commercial") == "light_commercial"
    assert normalize_vehicle_profile("high_mobility_4x4") == "high_mobility_4x4"
    assert normalize_vehicle_profile("tanker_laden") == "tanker_laden"


def test_all_eight_profiles_parameterized():
    """Verify all 8 profiles exist in VEHICLE_HYDRAULIC_PROFILES with required physical keys."""
    expected_profiles = [
        "light_commercial",
        "intermediate_truck",
        "medium_truck",
        "heavy_multi_axle",
        "tractor_trailer",
        "tanker_empty",
        "tanker_laden",
        "high_mobility_4x4",
    ]
    for p in expected_profiles:
        assert p in VEHICLE_HYDRAULIC_PROFILES, f"Missing profile: {p}"
        spec = VEHICLE_HYDRAULIC_PROFILES[p]
        assert "d_crit" in spec
        assert "excess_hold" in spec
        assert "depth_hold" in spec
        assert "hazard_desc" in spec
        assert "gamma_v" in spec
        assert spec["d_crit"] > 0.0
        assert spec["gamma_v"] >= 1.0


def test_light_commercial_hydrolock_hierarchy():
    """Light commercial vehicles (LCV) fail at lower water depths than medium and heavy trucks."""
    # At excess=0.45, depth=0.28m (approach ponding)
    excess = 0.45
    depth = 0.28
    load_ratio = 0.80

    lcv_risk, lcv_reason = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="light_commercial", depth_m=depth
    )
    mcv_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="medium_truck", depth_m=depth
    )
    hcv_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="heavy_multi_axle", depth_m=depth
    )

    assert lcv_risk == RiskLevel.HIGH.value
    assert "hydrolock" in lcv_reason.lower() or "light commercial" in lcv_reason.lower()
    assert mcv_risk == RiskLevel.WATCH.value
    assert hcv_risk == RiskLevel.WATCH.value


def test_tanker_empty_vs_laden_buoyancy():
    """Unladen empty tankers float at excess=0.50 (depth=0.30m), whereas laden tankers proceed with caution."""
    excess = 0.55
    depth = 0.32
    load_ratio = 0.85

    empty_risk, empty_reason = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="tanker_empty", depth_m=depth
    )
    laden_risk, laden_reason = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="tanker_laden", depth_m=depth
    )

    assert empty_risk == RiskLevel.HIGH.value
    assert "buoyancy" in empty_reason.lower() or "slide" in empty_reason.lower()
    assert laden_risk == RiskLevel.WATCH.value
    assert "caution" in laden_reason.lower() or "surge" in laden_reason.lower()


def test_high_mobility_4x4_extended_wading():
    """High-mobility 4x4 vehicles operate safely at depths exceeding standard truck intake heights."""
    # Depth = 0.60m, excess = 0.80: standard trucks fail, high-mobility 4x4 cautions
    excess = 0.80
    depth = 0.60
    load_ratio = 0.90

    hcv_risk, _ = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="heavy_multi_axle", depth_m=depth
    )
    hm_risk, hm_reason = evaluate_vehicle_risk(
        excess=excess, load_ratio=load_ratio, vehicle_profile="high_mobility_4x4", depth_m=depth
    )

    assert hcv_risk == RiskLevel.HIGH.value
    assert hm_risk == RiskLevel.WATCH.value
    assert "4wd" in hm_reason.lower() or "deep" in hm_reason.lower()


def test_score_route_geometry_all_eight_profiles():
    """Verify score_route_geometry executes without exception across all 8 profiles."""
    points = [[91.74, 26.14], [91.80, 26.18], [91.90, 26.25]]
    profiles = [
        "light_commercial",
        "intermediate_truck",
        "medium_truck",
        "heavy_multi_axle",
        "tractor_trailer",
        "tanker_empty",
        "tanker_laden",
        "high_mobility_4x4",
    ]
    for p in profiles:
        res = score_route_geometry(
            points=points,
            day=2,
            vehicle_profile=p,
            max_samples=10,
            nominal_duration_min=45.0,
        )
        assert res["verdict"] in (Verdict.GO.value, Verdict.CAUTION.value, Verdict.HOLD.value)
        assert res["operating_speed_kmh"] > 0.0
        assert len(res["legs"]) >= 2
