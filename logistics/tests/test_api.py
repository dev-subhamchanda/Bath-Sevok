"""Offline contract tests for the new modular FastAPI server (app/api/server.py)."""

import shutil
import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.api.server import app

DB = str(Path(__file__).resolve().parent.parent / "data" / "ne_india.duckdb")
tmp = Path(tempfile.mkdtemp()) / "test_api.duckdb"
shutil.copy(DB, tmp)
Q = {"db": str(tmp)}
client = TestClient(app)


def test_api_contracts():
    def get(path, **params):
        r = client.get(path, params={"db": str(tmp), **params})
        assert r.status_code == 200, (path, r.status_code, r.text[:200])
        return r.json()

    # 1. /health
    h = get("/health")
    assert h["ok"] and h["latest_run"] >= 1, h
    print(f"PASS: /health -> run {h['latest_run']}")

    # 2. /corridors
    corridors = get("/corridors")
    assert len(corridors["corridors"]) >= 8, corridors
    names = [c["name"] for c in corridors["corridors"]]
    assert "Assam-Manipur" in names
    assert all(set(c) >= {"risk", "action", "worst_point", "summary"} for c in corridors["corridors"])
    print(f"PASS: /corridors -> {len(corridors['corridors'])} corridors verified")

    # 3. /corridors/22
    detail = get("/corridors/22")
    assert detail["name"] == "Assam-Manipur" and len(detail["points"]) == 4, detail
    silchar = next(p for p in detail["points"] if p["name"] == "Silchar")
    assert silchar["risk"] in ("WATCH", "OK"), silchar
    print(f"PASS: /corridors/22 -> Silchar {silchar['risk']}, P(RP5)={silchar['p_rp5']}")

    # 4. /corridors/99 -> 404
    r = client.get("/corridors/99", params=Q)
    assert r.status_code == 404, r.status_code
    print("PASS: /corridors/99 -> 404")

    # 5. /points filter
    pts = get("/points", risk="WATCH", day=2)
    print(f"PASS: /points?risk=WATCH -> {len(pts['points'])} rows")

    # 6. /runs/latest
    run = get("/runs/latest")
    assert run["points"] >= 175 and run["corridors"] >= 8 and run["signals"] >= 8, run
    print(f"PASS: /runs/latest -> {run['points']} points, {run['corridors']} corridors, {run['signals']} signals")

    # 7. /alerts
    alerts = get("/alerts", floor="WATCH")
    assert all("key" in a for a in alerts["alerts"])
    assert all(a["risk"] in ("WATCH", "HIGH", "CRITICAL") for a in alerts["alerts"])
    print(f"PASS: /alerts -> {len(alerts['alerts'])} alerts verified")

    # 8. /route-risk
    route = client.post(
        "/route-risk",
        params=Q,
        json={"points": [[91.74, 26.14], [92.0, 25.5], [92.80, 24.83]], "day": 2},
    ).json()
    assert route["verdict"] in ("GO", "CAUTION", "HOLD"), route
    assert all("gauge_km" in leg for leg in route["legs"])
    assert len(route["legs"]) >= 3, route
    print(f"PASS: /route-risk -> verdict={route['verdict']}, {len(route['legs'])} legs")

    # 9. /segments
    segs = get("/segments")
    assert len(segs["segments"]) >= 30, segs
    print(f"PASS: /segments -> {len(segs['segments'])} segments live")

    # 10. /score-routes
    scored = client.post(
        "/score-routes",
        params=Q,
        json={
            "routes": [
                {"route_id": "a", "points": [[91.74, 26.14], [92.80, 24.83]]},
                {"route_id": "b", "points": [[91.74, 26.14], [91.88, 25.57], [92.80, 24.83]]},
            ],
            "day": 2,
        },
    ).json()
    assert scored["recommendation"] in ("a", "b"), scored
    assert sorted(scored["ranking"]) == ["a", "b"], scored
    print(f"PASS: /score-routes -> recommendation={scored['recommendation']}")

    # 11. /dispatch
    disp = client.post(
        "/dispatch",
        params=Q,
        json={
            "start": [91.74, 26.14],
            "end": [92.80, 24.83],
            "day": 2,
            "routes": [
                {"route_id": "m", "points": [[91.74, 26.14], [92.80, 24.83]]},
                {"route_id": "a", "points": [[91.74, 26.14], [91.88, 25.57], [92.80, 24.83]]},
            ],
        },
    ).json()
    assert disp["recommendation"] in ("m", "a"), disp
    print(f"PASS: /dispatch -> recommendation={disp['recommendation']}")

    # 12. /features (Logistics AI layer)
    feat = client.post(
        "/features",
        params=Q,
        json={"routes": [{"route_id": "f", "points": [[91.74, 26.14], [92.80, 24.83]]}], "day": 2},
    ).json()
    f = feat["routes"][0]["features"]
    assert set(f) >= {"max_p_rp5", "max_load_ratio", "frac_watch", "physics_floor"}, f
    assert feat["routes"][0]["legs"][0].keys() >= {"load_ratio", "q_mean", "trend"}, feat
    print(f"PASS: /features -> max_load={f['max_load_ratio']}, floor={f['physics_floor']}")

    # 13. /alerts/stream (SSE snapshot test)
    with client.stream("GET", "/alerts/stream", params=Q) as response:
        assert response.status_code == 200
        line = next(response.iter_lines())
        assert "event: snapshot" in line or line.startswith("event:")
    print("PASS: /alerts/stream -> SSE stream functional")

    print("\n>>> ALL 13 MODULAR CONTRACT TESTS PASSED PERFECTLY! <<<")


if __name__ == "__main__":
    test_api_contracts()
