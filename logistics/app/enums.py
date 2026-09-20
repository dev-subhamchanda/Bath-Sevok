"""Foundational domain enumerations and severity rankings."""

from enum import Enum
from typing import Literal

RiskType = Literal["OK", "WATCH", "HIGH", "CRITICAL"]
VerdictType = Literal["GO", "CAUTION", "HOLD"]
ActionType = Literal["PROCEED", "MONITOR", "DELAY", "REROUTE", "HOLD", "HALT_AND_STAGE", "UNVIABLE_HAIRPIN_RADIUS"]
TrendType = Literal["RISING", "STABLE", "FALLING"]


class RiskLevel(str, Enum):
    OK = "OK"
    WATCH = "WATCH"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Action(str, Enum):
    PROCEED = "PROCEED"
    MONITOR = "MONITOR"
    DELAY = "DELAY"
    REROUTE = "REROUTE"
    HOLD = "HOLD"
    HALT_AND_STAGE = "HALT_AND_STAGE"
    UNVIABLE_HAIRPIN_RADIUS = "UNVIABLE_HAIRPIN_RADIUS"


class Trend(str, Enum):
    RISING = "RISING"
    STABLE = "STABLE"
    FALLING = "FALLING"


class Verdict(str, Enum):
    GO = "GO"
    CAUTION = "CAUTION"
    HOLD = "HOLD"


class Confidence(str, Enum):
    HIGH = "high"
    LOW = "low"
    UNCALIBRATED = "uncalibrated"


class VehicleProfile(str, Enum):
    LIGHT_COMMERCIAL = "light_commercial"
    INTERMEDIATE_TRUCK = "intermediate_truck"
    MEDIUM_TRUCK = "medium_truck"
    HEAVY_MULTI_AXLE = "heavy_multi_axle"
    TRACTOR_TRAILER = "tractor_trailer"
    TANKER_EMPTY = "tanker_empty"
    TANKER_LADEN = "tanker_laden"
    HIGH_MOBILITY_4X4 = "high_mobility_4x4"


VEHICLE_PROFILE_ALIASES: dict[str, str] = {
    "heavy_truck": VehicleProfile.HEAVY_MULTI_AXLE.value,
    "tanker": VehicleProfile.TANKER_EMPTY.value,
}


def normalize_vehicle_profile(profile: str) -> str:
    """Normalize input profile string to canonical VehicleProfile value."""
    p = str(profile or "").strip().lower()
    return VEHICLE_PROFILE_ALIASES.get(p, p)


# Numeric ranks for sorting and severity comparisons (higher = worse)
RISK_RANK: dict[str, int] = {
    "OK": 0,
    "WATCH": 1,
    "HIGH": 2,
    "CRITICAL": 3,
}

VERDICT_RANK: dict[str, int] = {
    "GO": 0,
    "CAUTION": 1,
    "HOLD": 2,
}


def verdict_from_risk(risk: str) -> str:
    """Map a risk level directly to an operational vehicle verdict."""
    if risk in (RiskLevel.HIGH.value, RiskLevel.CRITICAL.value):
        return Verdict.HOLD.value
    if risk == RiskLevel.WATCH.value:
        return Verdict.CAUTION.value
    return Verdict.GO.value


def action_from_risk(risk: str, has_reroute: bool = False) -> str:
    """Map a risk level to a corridor action."""
    if risk == RiskLevel.CRITICAL.value:
        return Action.REROUTE.value if has_reroute else Action.HOLD.value
    if risk == RiskLevel.HIGH.value:
        return Action.DELAY.value
    if risk == RiskLevel.WATCH.value:
        return Action.MONITOR.value
    return Action.PROCEED.value
