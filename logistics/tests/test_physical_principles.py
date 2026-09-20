"""Test suite verifying physical principles: Load ratio floor, bottleneck manifest, and 4D trajectory."""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.modules.risk.scorer import score_route_geometry
from app.enums import Verdict, RiskLevel


def test_physical_floor_override():
    """Verify that Load Ratio >= 1.0 unconditionally forces HIGH risk and HOLD verdict."""
    points = [[92.80, 24.83], [92.81, 24.84]]
    # Gauge running at 120% of RP5 (Q=2400 vs RP5=2000), but synthetic P(RP5)=0.40
    gauges = [{
        "gauge": "Silchar_gauge",
        "river": "Barak",
        "cell_lon": 92.825,
        "cell_lat": 24.825,
        "q_mean": 2400.0,
        "q_p50": 2350.0,
        "q_p90": 2500.0,
        "rp5": 2000.0,
        "load_ratio": 1.20,
        "p_rp2": 0.95,
        "p_rp5": 0.40,  # Below 0.50 threshold!
        "p_rp10": 0.10,
        "trend": "RISING",
        "risk": "WATCH",  # Old logic would have labeled this WATCH / CAUTION
    }]
    crossings = [{
        "name": "Mahasadhu Bridge",
        "river": "Barak",
        "lon": 92.80,
        "lat": 24.83,
    }]

    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        segments=[],
        ways=[],
        max_samples=10,
    )

    # Physical Floor Principle enforces HOLD because Load Ratio >= 1.0
    assert scored["verdict"] == Verdict.HOLD.value, f"Expected HOLD, got {scored['verdict']}"
    assert scored["is_passable"] is False, "Route must be impassable"
    assert scored["first_blocker"] is not None, "First blocker must be identified"
    assert scored["first_blocker"]["location"] == "Mahasadhu Bridge"
    print("PASS: Physical floor override strictly enforced (Load Ratio >= 1.0 -> HOLD)")


def test_ungauged_crossing_isolation():
    """Verify that an ungauged river crossing does not falsely inherit distant river discharge."""
    points = [[93.60, 25.12], [93.61, 25.13]]  # Noney, Manipur
    # Only distant Brahmaputra gauge available
    gauges = [{
        "gauge": "Guwahati_gauge",
        "river": "Brahmaputra",
        "cell_lon": 91.675,
        "cell_lat": 26.175,
        "q_mean": 35000.0,
        "q_p50": 34000.0,
        "q_p90": 37000.0,
        "rp5": 58000.0,
        "load_ratio": 0.60,
        "p_rp2": 0.80,
        "p_rp5": 0.10,
        "p_rp10": 0.0,
        "trend": "STABLE",
        "risk": "OK",
    }]
    crossings = [{
        "name": "Irang Bridge",
        "river": "Irang",  # River is Irang, NOT Brahmaputra
        "lon": 93.60,
        "lat": 25.12,
    }]

    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        segments=[],
        ways=[],
        max_samples=10,
    )

    leg = scored["legs"][0]
    # River basin integrity: Irang Bridge must NOT adopt Brahmaputra gauge
    assert leg["river"] == "Irang", f"Expected Irang, got {leg['river']}"
    assert leg["gauge"] != "Guwahati_gauge", "Must not cross-contaminate with Brahmaputra gauge"
    print("PASS: Cross-basin hydrological contamination successfully blocked")


def test_vehicle_profile_sensitivity():
    """Verify that tankers are held at excess >= 0.50 due to buoyancy, while HCV proceeds with CAUTION."""
    points = [[92.80, 24.83], [92.81, 24.84]]
    # Overtopping regime: RP2=1800, RP5=2600, Q=2240 -> Excess = (2240-1800)/800 = 0.55
    gauges = [{
        "gauge": "Silchar_gauge",
        "river": "Barak",
        "cell_lon": 92.825,
        "cell_lat": 24.825,
        "q_mean": 2240.0,
        "q_p50": 2200.0,
        "q_p90": 2300.0,
        "rp2": 1800.0,
        "rp5": 2600.0,
        "load_ratio": 0.862,
        "p_rp2": 0.85,
        "p_rp5": 0.15,
        "p_rp10": 0.05,
        "trend": "STABLE",
        "risk": "WATCH",
    }]
    crossings = [{
        "name": "Mahasadhu Bridge",
        "river": "Barak",
        "lon": 92.80,
        "lat": 24.83,
    }]

    # 1. Heavy truck: excess 0.55 is manageable under crawl speed -> CAUTION
    hcv_res = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        vehicle_profile="heavy_truck",
    )
    assert hcv_res["verdict"] == Verdict.CAUTION.value, f"Expected CAUTION for HCV, got {hcv_res['verdict']}"
    assert hcv_res["is_passable"] is True, "HCV should be passable with caution"

    # 2. Tanker: excess 0.55 >= 0.50 triggers lateral buoyancy slide hazard -> HOLD
    tanker_res = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        vehicle_profile="tanker",
    )
    assert tanker_res["verdict"] == Verdict.HOLD.value, f"Expected HOLD for Tanker, got {tanker_res['verdict']}"
    assert tanker_res["is_passable"] is False, "Tanker must be held due to buoyancy risk"
    assert "buoyancy" in tanker_res["first_blocker"]["reason"].lower(), "Reason must cite tanker buoyancy"
    print("PASS: Vehicle profile sensitivity verified (HCV=CAUTION vs Tanker=HOLD at Excess=0.55)")


def test_bankfull_clearance():
    """Verify that flow within natural river banks (Q < RP2) does not falsely trigger HOLD."""
    points = [[92.80, 24.83], [92.81, 24.84]]
    # In-bank flow: Q=1500 vs RP2=1800, RP5=2600
    gauges = [{
        "gauge": "Silchar_gauge",
        "river": "Barak",
        "cell_lon": 92.825,
        "cell_lat": 24.825,
        "q_mean": 1500.0,
        "q_p50": 1480.0,
        "q_p90": 1550.0,
        "rp2": 1800.0,
        "rp5": 2600.0,
        "load_ratio": 0.577,
        "p_rp2": 0.10,
        "p_rp5": 0.0,
        "p_rp10": 0.0,
        "trend": "STABLE",
        "risk": "OK",
    }]
    crossings = [{
        "name": "Mahasadhu Bridge",
        "river": "Barak",
        "lon": 92.80,
        "lat": 24.83,
    }]

    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=crossings,
        vehicle_profile="tanker",
    )
    assert scored["verdict"] == Verdict.GO.value, f"Expected GO for in-bank flow, got {scored['verdict']}"
    assert scored["is_passable"] is True
    print("PASS: Bankfull clearance verified (In-bank flow Q < RP2 -> GO)")


def test_safe_dispatch_window():
    """Verify that a blocked route identifies the earliest safe departure day when hydrograph recedes."""
    points = [[92.80, 24.83], [92.81, 24.84]]
    crossings = [{
        "name": "Mahasadhu Bridge",
        "river": "Barak",
        "lon": 92.80,
        "lat": 24.83,
    }]

    # Build 7-day multi-day hydrograph showing recession from Day 1 to Day 3
    # Day 1: Q=2800 (RP5=2500 -> HOLD)
    # Day 2: Q=2600 (HOLD)
    # Day 3: Q=1700 (RP2=1800 -> in-bank -> GO)
    def make_gauge(q, trend="FALLING"):
        return [{
            "gauge": "Silchar_gauge",
            "river": "Barak",
            "cell_lon": 92.825,
            "cell_lat": 24.825,
            "q_mean": q,
            "q_p50": q,
            "q_p90": q + 50,
            "rp2": 1800.0,
            "rp5": 2500.0,
            "load_ratio": round(q / 2500.0, 3),
            "p_rp2": 0.9 if q > 1800 else 0.1,
            "p_rp5": 0.8 if q > 2500 else 0.0,
            "p_rp10": 0.0,
            "trend": trend,
            "risk": "HIGH" if q >= 2500 else "OK",
        }]

    gauges_by_day = {
        0: make_gauge(2900.0),
        1: make_gauge(2800.0),
        2: make_gauge(2600.0),
        3: make_gauge(1700.0),
        4: make_gauge(1500.0),
        5: make_gauge(1400.0),
        6: make_gauge(1300.0),
    }

    scored = score_route_geometry(
        points=points,
        day=1,
        departure_day=1,
        gauges=gauges_by_day[1],
        crossings=crossings,
        gauges_by_day=gauges_by_day,
        vehicle_profile="heavy_truck",
    )

    assert scored["verdict"] == Verdict.HOLD.value, "Route must be held on Day 1"
    assert scored["dispatch_window"] is not None, "Dispatch window must be computed"
    dw = scored["dispatch_window"]
    assert dw["is_receding"] is True, "Hydrograph must be flagged as receding"
    assert dw["safe_departure_day"] == 3, f"Expected safe day 3, got {dw['safe_departure_day']}"
    assert dw["estimated_wait_hours"] == 48.0, f"Expected 48h wait, got {dw['estimated_wait_hours']}"
    print(f"PASS: Safe dispatch window verified -> Day {dw['safe_departure_day']} ({dw['estimated_wait_hours']}h wait)")


def test_kaziranga_floodplain_corridor():
    """Verify that coordinates traversing NH37 along Kaziranga are tagged as the linear floodplain stretch."""
    # Point located on NH37 in Kaziranga National Park (between 92.90-93.65E, 26.50-26.70N)
    points = [[93.15, 26.58], [93.18, 26.59]]
    gauges = [{
        "gauge": "Tezpur_gauge",
        "river": "Brahmaputra",
        "cell_lon": 92.80,
        "cell_lat": 26.62,
        "q_mean": 60000.0,
        "q_p50": 59000.0,
        "q_p90": 62000.0,
        "rp2": 42000.0,
        "rp5": 52000.0,
        "load_ratio": 1.15,
        "p_rp2": 0.99,
        "p_rp5": 0.85,
        "p_rp10": 0.30,
        "trend": "RISING",
        "risk": "HIGH",
    }]

    # No point crossings passed; detection must occur via linear corridor bounding
    scored = score_route_geometry(
        points=points,
        day=2,
        gauges=gauges,
        crossings=[],
        vehicle_profile="heavy_truck",
    )

    leg = scored["legs"][0]
    assert leg["crossing"] == "Kaziranga NH37 Floodplain Stretch", f"Expected Kaziranga stretch, got {leg['crossing']}"
    assert leg["river"] == "Brahmaputra", f"Expected Brahmaputra, got {leg['river']}"
    assert scored["verdict"] == Verdict.HOLD.value
    assert scored["first_blocker"]["location"] == "Kaziranga NH37 Floodplain Stretch"
    print("PASS: Kaziranga NH37 linear floodplain corridor detection verified")


if __name__ == "__main__":
    test_physical_floor_override()
    test_ungauged_crossing_isolation()
    test_vehicle_profile_sensitivity()
    test_bankfull_clearance()
    test_safe_dispatch_window()
    test_kaziranga_floodplain_corridor()
    print("\n>>> ALL PHYSICAL PRINCIPLE TESTS PASSED! <<<")

