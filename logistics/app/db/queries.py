from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, List, Dict, Optional, Tuple

import duckdb
from app.enums import RISK_RANK


def _fetch_dicts(con: duckdb.DuckDBPyConnection, sql: str, params: list | None = None) -> List[Dict[str, Any]]:
    """Execute a query and return rows as dictionaries."""
    rows = con.execute(sql, params or []).fetchall()
    cols = [d[0] for d in con.description]
    return [dict(zip(cols, r)) for r in rows]


def get_latest_run_id(con: duckdb.DuckDBPyConnection) -> Optional[int]:
    """Return the most recent forecast run ID."""
    row = con.execute("SELECT MAX(run_id) FROM forecast_runs").fetchone()
    return row[0] if row and row[0] is not None else None


def get_run_metadata(con: duckdb.DuckDBPyConnection, run_id: int) -> Optional[Dict[str, Any]]:
    """Return metadata and record counts for a given run."""
    rows = _fetch_dicts(
        con,
        "SELECT run_id, run_at, horizon_days, source_id, notes FROM forecast_runs WHERE run_id = ?",
        [run_id],
    )
    if not rows:
        return None
    counts = con.execute(
        """SELECT (SELECT COUNT(*) FROM forecast_points WHERE run_id = ?) AS points,
                  (SELECT COUNT(*) FROM corridor_assessments WHERE run_id = ?) AS corridors,
                  (SELECT COUNT(*) FROM hazard_signals WHERE run_id = ?) AS signals""",
        [run_id, run_id, run_id],
    ).fetchone()
    return {
        **rows[0],
        "points": counts[0],
        "corridors": counts[1],
        "signals": counts[2],
    }


def get_all_corridors(con: duckdb.DuckDBPyConnection, run_id: int) -> List[Dict[str, Any]]:
    """Fetch high-level risk and action for all corridors for a specific run."""
    return _fetch_dicts(
        con,
        """SELECT c.corridor_id, c.name, c.highways, c.has_reroute,
                  a.risk, a.action, a.worst_point, a.worst_p_rp5, a.summary
           FROM corridors c
           JOIN corridor_assessments a
             ON a.corridor_id = c.corridor_id AND a.run_id = ?
           ORDER BY c.corridor_id""",
        [run_id],
    )


def get_corridor_detail(
    con: duckdb.DuckDBPyConnection, corridor_id: int, run_id: int, day: int = 2
) -> Optional[Dict[str, Any]]:
    """Fetch single corridor assessment plus station points for a specific day."""
    meta = _fetch_dicts(
        con,
        """SELECT c.corridor_id, c.name, c.highways, c.has_reroute,
                  a.risk, a.action, a.worst_point, a.worst_p_rp5, a.summary
           FROM corridors c
           JOIN corridor_assessments a
             ON a.corridor_id = c.corridor_id AND a.run_id = ?
           WHERE c.corridor_id = ?""",
        [run_id, corridor_id],
    )
    if not meta:
        return None
    points = _fetch_dicts(
        con,
        """SELECT cp.point_name AS name, cp.river, cp.lon, cp.lat, cp.role,
                  fp.day, fp.q_mean, fp.q_p10, fp.q_p50, fp.q_p90,
                  fp.p_rp2, fp.p_rp5, fp.p_rp10, fp.risk, fp.trend,
                  fp.rp2, fp.rp5, fp.rp10
           FROM corridor_points cp
           LEFT JOIN forecast_points fp
             ON fp.station_name = cp.point_name AND fp.run_id = ? AND fp.day = ?
           WHERE cp.corridor_id = ?
           ORDER BY cp.rowid""",
        [run_id, day, corridor_id],
    )
    return {**meta[0], "run_id": run_id, "day": day, "points": points}


def get_points(
    con: duckdb.DuckDBPyConnection,
    run_id: int,
    risk: str | None = None,
    day: int | None = None,
) -> List[Dict[str, Any]]:
    """Query point forecasts with optional risk level and day filters."""
    sql = """SELECT station_name AS name, day, q_mean, q_p10, q_p50, q_p90,
                    p_rp2, p_rp5, p_rp10, risk, trend, rp2, rp5, rp10
             FROM forecast_points WHERE run_id = ?"""
    params: list[Any] = [run_id]
    if risk:
        sql += " AND risk = ?"
        params.append(risk)
    if day is not None:
        sql += " AND day = ?"
        params.append(day)
    sql += " ORDER BY station_name, day"
    return _fetch_dicts(con, sql, params)


def get_gauge_cells(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return all confirmed CWC gauge cells and their coordinates."""
    return _fetch_dicts(con, "SELECT gauge, river, gauge_lon, gauge_lat, cell_lon, cell_lat FROM gauge_cells")


def get_corridor_points_coords(con: duckdb.DuckDBPyConnection) -> Dict[str, Tuple[float, float]]:
    """Return dictionary of corridor point names to (lon, lat) coordinates."""
    rows = con.execute("SELECT DISTINCT point_name, lon, lat FROM corridor_points").fetchall()
    return {r[0]: (float(r[1]), float(r[2])) for r in rows}


def get_crossings(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Fetch physical river crossing bottlenecks (bridges, low-lying sections) from structures table."""
    try:
        return _fetch_dicts(
            con,
            """SELECT structure_id, kind, name, river, lon, lat, notes, status,
                      clearance_m, clearance_class
               FROM structures WHERE lon IS NOT NULL AND lat IS NOT NULL"""
        )
    except Exception:
        return []


def get_linear_hazards(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Fetch registered linear hazard stretches (e.g. floodplain overtopping corridors) from database."""
    try:
        return _fetch_dicts(
            con,
            """SELECT hazard_id, name, river, kind, lon_min, lon_max, lat_min, lat_max,
                      clearance_m, clearance_class, notes, status
               FROM linear_hazards"""
        )
    except Exception:
        return []


def get_multi_day_gauge_levels(con: duckdb.DuckDBPyConnection, run_id: int) -> Dict[int, List[Dict[str, Any]]]:
    """Fetch gauge levels across all available forecast days (0-6) indexed by day.

    Optimized: fetches static data (gauge_cells, stations, corridor_points) once
    and all forecast_points in a single query, then assembles per-day results in Python.
    """
    gauges = _fetch_dicts(con, "SELECT gauge, river, cell_lon, cell_lat FROM gauge_cells")

    station_cells: Dict[str, tuple] = {r["name"]: (r["lon"], r["lat"]) for r in _fetch_dicts(con, "SELECT name, lon, lat FROM stations")}
    station_cells.update({
        r["point_name"]: (r["lon"], r["lat"])
        for r in _fetch_dicts(con, "SELECT DISTINCT point_name, lon, lat FROM corridor_points")
    })

    all_assessed = _fetch_dicts(
        con,
        """SELECT station_name, day, q_mean, q_p50, q_p90, p_rp2, p_rp5, p_rp10,
                  risk, trend, rp2, rp5, rp10
           FROM forecast_points WHERE run_id = ? AND day IN (0,1,2,3,4,5,6)""",
        [run_id],
    )
    by_day: Dict[int, Dict[str, Dict[str, Any]]] = {d: {} for d in range(7)}
    for r in all_assessed:
        by_day[r["day"]][r["station_name"]] = r

    return {
        d: _assemble_gauge_level(gauges, station_cells, assessed)
        for d, assessed in by_day.items()
    }


def get_gauge_levels(con: duckdb.DuckDBPyConnection, run_id: int, day: int = 2) -> List[Dict[str, Any]]:
    """Fetch gauge cells with active discharge, return periods, and load ratios for a specific day."""
    gauges = _fetch_dicts(con, "SELECT gauge, river, cell_lon, cell_lat FROM gauge_cells")
    assessed = {
        r["station_name"]: r
        for r in _fetch_dicts(
            con,
            """SELECT station_name, q_mean, q_p50, q_p90, p_rp2, p_rp5, p_rp10,
                      risk, trend, rp2, rp5, rp10
               FROM forecast_points WHERE run_id = ? AND day = ?""",
            [run_id, day],
        )
    }
    station_cells: Dict[str, tuple] = {r["name"]: (r["lon"], r["lat"]) for r in _fetch_dicts(con, "SELECT name, lon, lat FROM stations")}
    station_cells.update({
        r["point_name"]: (r["lon"], r["lat"])
        for r in _fetch_dicts(con, "SELECT DISTINCT point_name, lon, lat FROM corridor_points")
    })
    return _assemble_gauge_level(gauges, station_cells, assessed)


def _assemble_gauge_level(
    gauges: List[Dict[str, Any]],
    station_cells: Dict[str, tuple],
    assessed: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Merge gauge cells with their nearest assessed forecast point."""
    out = []
    for g in gauges:
        best_station = min(
            (n for n in assessed if n in station_cells),
            key=lambda n: abs(station_cells[n][0] - g["cell_lon"]) + abs(station_cells[n][1] - g["cell_lat"]),
            default=None,
        )
        stats = assessed.get(best_station, {})
        rp5 = stats.get("rp5", 0.0) or 0.0
        q_mean = stats.get("q_mean", 0.0) or 0.0
        load_ratio = round(q_mean / rp5, 3) if rp5 > 0 else 0.0
        q_p90 = stats.get("q_p90", 0.0) or 0.0
        q_p50 = stats.get("q_p50", 0.0) or 0.0

        out.append({
            **g,
            "station": best_station,
            "q_mean": q_mean,
            "q_p50": q_p50,
            "q_p90": q_p90,
            "spread": q_p90 - q_p50,
            "load_ratio": load_ratio,
            "p_rp2": stats.get("p_rp2", 0.0) or 0.0,
            "p_rp5": stats.get("p_rp5", 0.0) or 0.0,
            "p_rp10": stats.get("p_rp10", 0.0) or 0.0,
            "rp2": stats.get("rp2", 0.0) or 0.0,
            "rp5": rp5,
            "trend": stats.get("trend", "STABLE"),
            "risk": stats.get("risk", "OK"),
        })
    return out


def get_road_ways(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return OSM road ways indexed by bounding boxes."""
    try:
        return _fetch_dicts(
            con,
            "SELECT way_id, aoi, highway, ref, name, bridge, lon_min, lon_max, lat_min, lat_max FROM road_ways",
        )
    except Exception:
        return []


def get_road_segments(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return registered road segments with dynamically resolved hydraulic closure thresholds."""
    try:
        from app.modules.risk.hydraulics import calc_inversion_q
        rows = _fetch_dicts(
            con,
            """SELECT segment_id, highway, segment, river, threshold_station, threshold_q, notes
               FROM road_segments ORDER BY segment_id""",
        )
        rp_rows = con.execute("SELECT station_name, rp_key, q_discharge FROM station_return_periods WHERE rp_key IN ('rp2', 'rp5')").fetchall()
        rp_map: Dict[str, Dict[str, float]] = {}
        for st_name, rp_key, q in rp_rows:
            rp_map.setdefault(st_name, {})[rp_key] = float(q)
            rp_map.setdefault(st_name.replace("_gauge", ""), {})[rp_key] = float(q)

        for r in rows:
            st = r.get("threshold_station")
            st_rp = rp_map.get(st, {})
            rp2 = st_rp.get("rp2", 0.0)
            rp5 = st_rp.get("rp5", 0.0)
            aoi = r.get("segment", "").split(":")[0].lower()
            terrain = "mountain_ghat" if aoi in ("shillong", "imphal") else "plain"
            hwy = r.get("highway", "primary").lower()
            has_bridge = "bridge" in r.get("notes", "").lower()
            clearance = 0.30 if has_bridge else (0.10 if "trunk" in hwy else 0.0)

            if r.get("threshold_q") is None and rp2 > 0 and rp5 > rp2:
                dyn_q = calc_inversion_q(
                    rp2=rp2,
                    rp5=rp5,
                    terrain_class=terrain,
                    clearance_m=clearance,
                    vehicle_profile="heavy_truck",
                )
                r["threshold_q"] = dyn_q
                r["notes"] = f"{r.get('notes', '')} [dynamically resolved via hydraulic inversion Q_th={dyn_q:.1f} m3/s ({terrain})]"
        return rows
    except Exception:
        return []


def get_weather_signals(con: duckdb.DuckDBPyConnection, run_id: int) -> Dict[str, Dict[str, Any]]:
    """Return latest weather signals (24h/3d rain) keyed by gauge name."""
    try:
        rows = _fetch_dicts(
            con,
            "SELECT gauge, rain_24h, rain_3d, rain_7d_fcst, risk FROM weather_signals WHERE run_id = ?",
            [run_id],
        )
        return {r["gauge"]: r for r in rows}
    except Exception:
        return {}


def get_firing_alerts(con: duckdb.DuckDBPyConnection, run_id: int, floor: str = "WATCH") -> List[Dict[str, Any]]:
    """Query active alerts at or above the given severity floor."""
    min_rank = RISK_RANK.get(floor, 1)
    rows = _fetch_dicts(
        con,
        """SELECT c.corridor_id, c.name AS target, a.risk, a.action,
                  a.worst_point, a.worst_p_rp5 AS prob, a.summary AS detail
           FROM corridors c
           JOIN corridor_assessments a
             ON a.corridor_id = c.corridor_id AND a.run_id = ?""",
        [run_id],
    )
    alerts = []
    for r in rows:
        if RISK_RANK.get(r["risk"], 0) >= min_rank:
            # Key alerts by the worst bottleneck point to avoid corridor-level collision
            point_label = r["worst_point"] if r["worst_point"] else r["target"]
            alerts.append({
                **r,
                "key": f"{point_label}:{r['risk']}",
            })
    return alerts


def check_alert_cooldown(
    con: duckdb.DuckDBPyConnection, alert_key: str
) -> Tuple[Optional[str], Optional[datetime]]:
    """Check previous level and cooldown expiry for an alert key."""
    try:
        row = con.execute(
            "SELECT level, cooldown_until FROM alert_state WHERE alert_key = ?", [alert_key]
        ).fetchone()
        if not row:
            return None, None
        level, cd_until = row[0], row[1]
        dt = datetime.fromisoformat(str(cd_until)) if cd_until else None
        return level, dt
    except Exception:
        return None, None


def update_alert_state(
    con: duckdb.DuckDBPyConnection, alert_key: str, level: str, fired_at: str, cooldown_until: str
) -> None:
    """Insert or update the firing cooldown state for an alert key."""
    con.execute(
        "INSERT OR REPLACE INTO alert_state VALUES (?, ?, ?, ?)",
        [alert_key, level, fired_at, cooldown_until],
    )


def insert_forecast_run(
    con: duckdb.DuckDBPyConnection,
    run_at: str,
    horizon_days: int,
    source_id: str,
    points_data: List[tuple],
    corridor_data: List[tuple],
    signal_data: List[tuple],
) -> int:
    """Persist a complete forecast run atomically."""
    con.execute("BEGIN TRANSACTION")
    try:
        run_id = con.execute(
            """INSERT INTO forecast_runs(run_id, run_at, horizon_days, source_id)
               VALUES (nextval('forecast_run_seq'), CAST(? AS TIMESTAMP), ?, ?)
               RETURNING run_id""",
            [run_at, horizon_days, source_id],
        ).fetchone()[0]

        # Insert points: (run_id, station_name, day, q_mean, q_ctrl, q_p10, q_p50, q_p90, n, p2, p5, p10, risk, trend, rp2, rp5, rp10)
        expanded_points = [(run_id, *p) for p in points_data]
        con.executemany(
            "INSERT INTO forecast_points VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            expanded_points,
        )

        expanded_corridors = [(run_id, *c) for c in corridor_data]
        con.executemany(
            "INSERT INTO corridor_assessments VALUES (?, ?, ?, ?, ?, ?, ?)",
            expanded_corridors,
        )

        expanded_signals = [(run_id, *s) for s in signal_data]
        con.executemany(
            "INSERT INTO hazard_signals VALUES (?, ?, ?, ?, ?, ?)",
            expanded_signals,
        )

        con.execute("COMMIT")
        return run_id
    except Exception:
        con.execute("ROLLBACK")
        raise


def insert_weather_signals(con: duckdb.DuckDBPyConnection, run_id: int, rows: List[tuple]) -> None:
    """Insert or update 24h/72h weather signals for a run."""
    expanded = [(run_id, *r) for r in rows]
    con.executemany(
        "INSERT OR REPLACE INTO weather_signals VALUES (?, ?, ?, ?, ?, ?)",
        expanded,
    )


def get_corridor_definitions(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return all registered Northeast India corridors with highway numbers, reroute capability, and terrain."""
    try:
        return _fetch_dicts(
            con,
            """SELECT corridor_id, name, highways, has_reroute,
                      terrain_class, v_min_kmh, v_max_kmh,
                      coalesce((v_min_kmh + v_max_kmh) / 2.0, 40.0) AS speed_kmh
               FROM corridors ORDER BY corridor_id"""
        )
    except Exception:
        return []


def get_all_corridor_points(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return all corridor topological points with coordinates and river basin assignment."""
    return _fetch_dicts(
        con,
        "SELECT corridor_id, point_name, river, lon, lat, role FROM corridor_points ORDER BY corridor_id, rowid"
    )


def build_linestring_wkt(points: List[Tuple[float, float]], max_points: int = 500) -> Optional[str]:
    """Construct an OGC WKT LINESTRING from coordinate pairs, subsampling if too dense."""
    if not points or len(points) < 2:
        return None
    n = len(points)
    if n > max_points:
        step = max(1, n // max_points)
        sampled = [points[i] for i in range(0, n - 1, step)]
        if sampled[-1] != points[-1]:
            sampled.append(points[-1])
    else:
        sampled = points
    return f"LINESTRING({', '.join(f'{round(p[0], 6)} {round(p[1], 6)}' for p in sampled)})"


def get_spatial_route_hazards(
    con: duckdb.DuckDBPyConnection,
    points: List[Tuple[float, float]],
    extra_hazards: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Evaluate an arbitrary route polyline against active SACHET alerts, mountain corridors, and dynamic hazards.

    Uses native DuckDB Spatial extension C++ functions (ST_Intersects, ST_Intersection, ST_Length).
    Calculates trapped road kilometers using geographic degree-to-km scaling (approx 105.0 km/deg).

    Returns:
        {
            "active_sachet_alerts": list of intersecting alert dictionaries with blocked_km,
            "active_dynamic_hazards": list of intersecting dynamic hazard dictionaries,
            "total_blocked_km": sum of road km inside alert zones,
            "has_active_roadblock": True if any roadblock/critical alert intersects with blocked_km > 0,
            "intersected_mountain_corridors": list of intersecting mountain corridor dicts with mountain_km,
            "total_mountain_km": sum of traversed mountain terrain km,
            "max_landslide_susceptibility": float in [0.0, 1.0],
        }
    """
    empty_res: Dict[str, Any] = {
        "active_sachet_alerts": [],
        "active_dynamic_hazards": [],
        "total_blocked_km": 0.0,
        "has_active_roadblock": False,
        "intersected_mountain_corridors": [],
        "total_mountain_km": 0.0,
        "max_landslide_susceptibility": 0.0,
    }

    line_wkt = build_linestring_wkt(points)
    if not line_wkt:
        return empty_res

    # 1. Query active SACHET alerts intersecting the route geometry
    sachet_sql = """
        SELECT
            a.identifier,
            a.sender,
            a.event,
            a.severity,
            a.urgency,
            a.certainty,
            a.headline,
            a.instruction,
            a.area_desc,
            ROUND(
                ST_Length(ST_Intersection(a.geom, route.geom)) *
                (111.0 * (0.5 + 0.5 * cos(radians(coalesce(ST_Y(ST_Centroid(ST_Intersection(a.geom, route.geom))), 26.0))))),
                2
            ) AS blocked_km
        FROM sachet_alerts a,
             (SELECT ST_GeomFromText(?) AS geom) route
        WHERE (a.expires_at > now() OR a.expires_at IS NULL)
          AND ST_Intersects(a.geom, route.geom)
    """
    try:
        sachet_alerts = _fetch_dicts(con, sachet_sql, [line_wkt])
    except Exception:
        sachet_alerts = []

    # 2. Query mountain corridor susceptibility zones intersecting the route geometry
    mountain_sql = """
        SELECT
            m.corridor_id,
            m.name,
            m.state,
            m.baseline_susceptibility,
            m.notes,
            ROUND(
                ST_Length(ST_Intersection(m.geom, route.geom)) *
                (111.0 * (0.5 + 0.5 * cos(radians(coalesce(ST_Y(ST_Centroid(ST_Intersection(m.geom, route.geom))), 26.0))))),
                2
            ) AS mountain_km
        FROM mountain_corridor_geoms m,
             (SELECT ST_GeomFromText(?) AS geom) route
        WHERE ST_Intersects(m.geom, route.geom)
    """
    try:
        mountain_corridors = _fetch_dicts(con, mountain_sql, [line_wkt])
    except Exception:
        mountain_corridors = []

    # 3. Query active dynamic hazards intersecting the route points
    active_dyn_hazards = []
    try:
        dyn_rows = _fetch_dicts(
            con,
            """SELECT hazard_id, name, geometry_type, lon_min, lat_min, lon_max, lat_max,
                      polygon_geojson, radius_km, hazard_type, severity
               FROM dynamic_hazards
               WHERE active = TRUE
                 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"""
        )
    except Exception:
        dyn_rows = []

    all_hazards_to_check = list(dyn_rows)
    if extra_hazards:
        for eh in extra_hazards:
            if "bbox" in eh:
                b = eh["bbox"]
                all_hazards_to_check.append({
                    "hazard_id": eh.get("hazard_id", "adhoc"),
                    "name": eh.get("name", "Adhoc Hazard"),
                    "lon_min": b[0], "lat_min": b[1], "lon_max": b[2], "lat_max": b[3],
                    "hazard_type": eh.get("hazard_type", "roadblock"),
                    "severity": eh.get("severity", "CRITICAL"),
                })
            elif "lon_min" in eh:
                all_hazards_to_check.append(eh)

    for h in all_hazards_to_check:
        h_min_x, h_min_y = h["lon_min"], h["lat_min"]
        h_max_x, h_max_y = h["lon_max"], h["lat_max"]
        for px, py in points:
            if h_min_x <= px <= h_max_x and h_min_y <= py <= h_max_y:
                active_dyn_hazards.append(h)
                break

    has_dyn_block = any(
        h.get("severity") in ("CRITICAL", "HIGH", "Severe", "Extreme") or
        h.get("hazard_type") in ("roadblock", "flood", "landslide")
        for h in active_dyn_hazards
    )
    has_sachet_block = any(
        a.get("blocked_km", 0.0) > 0.0 and a.get("severity") in ("Severe", "Extreme", "Moderate")
        for a in sachet_alerts
    )
    has_roadblock = has_sachet_block or has_dyn_block

    total_blocked_km = round(sum(a.get("blocked_km", 0.0) for a in sachet_alerts) + len(active_dyn_hazards) * 5.0, 2)

    total_mountain_km = round(sum(m.get("mountain_km", 0.0) for m in mountain_corridors), 2)
    max_susceptibility = max(
        [m.get("baseline_susceptibility", 0.0) for m in mountain_corridors],
        default=0.0,
    )

    return {
        "active_sachet_alerts": sachet_alerts,
        "active_dynamic_hazards": active_dyn_hazards,
        "total_blocked_km": total_blocked_km,
        "has_active_roadblock": has_roadblock,
        "intersected_mountain_corridors": mountain_corridors,
        "total_mountain_km": total_mountain_km,
        "max_landslide_susceptibility": round(max_susceptibility, 3),
    }


def get_cached_weather_grid(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return all active monitored points with their cached weather forecast profiles."""
    try:
        return _fetch_dicts(
            con,
            """SELECT point_id, point_name, corridor_id, river, lon, lat,
                      rain_24h, rain_3d, rain_7d_fcst,
                      current_rain_mm_h, current_visibility_m, current_wind_gust_kmh,
                      hourly_precipitation, hourly_visibility, hourly_weather_code,
                      hourly_wind_gust, hourly_time,
                      min_visibility_m, max_wind_gust_kmh, risk, updated_at
               FROM weather_forecast_grid ORDER BY corridor_id, point_name"""
        )
    except Exception:
        return []


def upsert_weather_grid(con: duckdb.DuckDBPyConnection, rows: List[Dict[str, Any]]) -> None:
    """Insert or update batch weather profiles in weather_forecast_grid."""
    if not rows:
        return
    sql = """
        INSERT OR REPLACE INTO weather_forecast_grid (
            point_id, point_name, corridor_id, river, lon, lat,
            rain_24h, rain_3d, rain_7d_fcst,
            current_rain_mm_h, current_visibility_m, current_wind_gust_kmh,
            hourly_precipitation, hourly_visibility, hourly_weather_code,
            hourly_wind_gust, hourly_time,
            min_visibility_m, max_wind_gust_kmh, risk, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
    """
    params = [
        (
            r["point_id"],
            r["point_name"],
            r.get("corridor_id"),
            r.get("river"),
            float(r["lon"]),
            float(r["lat"]),
            float(r.get("rain_24h", 0.0)),
            float(r.get("rain_3d", 0.0)),
            float(r.get("rain_7d_fcst", 0.0)),
            float(r.get("current_rain_mm_h", 0.0)),
            float(r.get("current_visibility_m", 10000.0)),
            float(r.get("current_wind_gust_kmh", 0.0)),
            r.get("hourly_precipitation", "[]"),
            r.get("hourly_visibility", "[]"),
            r.get("hourly_weather_code", "[]"),
            r.get("hourly_wind_gust", "[]"),
            r.get("hourly_time", "[]"),
            float(r.get("min_visibility_m", 10000.0)),
            float(r.get("max_wind_gust_kmh", 0.0)),
            r.get("risk", "OK"),
        )
        for r in rows
    ]
    con.executemany(sql, params)


def get_corridor_weather_summary(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """Return weather risk summary across all 37 corridors."""
    try:
        return _fetch_dicts(con, "SELECT * FROM v_corridor_weather_summary ORDER BY corridor_id")
    except Exception:
        return []


def get_corridor_weather_details(con: duckdb.DuckDBPyConnection, corridor_id: int) -> Optional[Dict[str, Any]]:
    """Return corridor weather summary and individual chokepoint weather metrics."""
    try:
        summaries = _fetch_dicts(
            con,
            "SELECT * FROM v_corridor_weather_summary WHERE corridor_id = ?",
            [corridor_id],
        )
        if not summaries:
            return None
        summary = summaries[0]
        points = _fetch_dicts(
            con,
            """SELECT point_id, point_name, river, lon, lat,
                      rain_24h, rain_3d, rain_7d_fcst,
                      current_rain_mm_h, current_visibility_m, current_wind_gust_kmh,
                      min_visibility_m, max_wind_gust_kmh, risk, updated_at
               FROM weather_forecast_grid WHERE corridor_id = ? ORDER BY point_name""",
            [corridor_id],
        )
        summary["points"] = points
        return summary
    except Exception:
        return None


def init_dynamic_hazards_table(con: duckdb.DuckDBPyConnection) -> None:
    """Initialize dynamic_hazards table if not present and connection is writable."""
    try:
        con.execute(
            """CREATE TABLE IF NOT EXISTS dynamic_hazards (
                hazard_id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                geometry_type VARCHAR NOT NULL,
                lon_min DOUBLE NOT NULL,
                lat_min DOUBLE NOT NULL,
                lon_max DOUBLE NOT NULL,
                lat_max DOUBLE NOT NULL,
                polygon_geojson VARCHAR,
                radius_km DOUBLE DEFAULT 2.5,
                hazard_type VARCHAR NOT NULL,
                severity VARCHAR DEFAULT 'CRITICAL',
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )"""
        )
    except Exception:
        pass


def insert_dynamic_hazard(con: duckdb.DuckDBPyConnection, hazard: Dict[str, Any]) -> Dict[str, Any]:
    """Insert or replace a dynamic hazard in the local registry."""
    init_dynamic_hazards_table(con)
    con.execute(
        """INSERT OR REPLACE INTO dynamic_hazards
           (hazard_id, name, geometry_type, lon_min, lat_min, lon_max, lat_max,
            polygon_geojson, radius_km, hazard_type, severity, active, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            hazard["hazard_id"],
            hazard["name"],
            hazard["geometry_type"],
            hazard["lon_min"],
            hazard["lat_min"],
            hazard["lon_max"],
            hazard["lat_max"],
            hazard.get("polygon_geojson"),
            hazard.get("radius_km", 2.5),
            hazard["hazard_type"],
            hazard.get("severity", "CRITICAL"),
            hazard.get("active", True),
            hazard.get("expires_at"),
        ],
    )
    return hazard


def get_active_dynamic_hazards(
    con: duckdb.DuckDBPyConnection,
    bbox: Optional[Tuple[float, float, float, float]] = None,
) -> List[Dict[str, Any]]:
    """Retrieve active dynamic hazards, optionally filtered by a corridor bounding box."""
    sql = """SELECT hazard_id, name, geometry_type, lon_min, lat_min, lon_max, lat_max,
                    polygon_geojson, radius_km, hazard_type, severity, active, created_at, expires_at
             FROM dynamic_hazards
             WHERE active = TRUE
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)"""
    params = []
    if bbox:
        min_lon, min_lat, max_lon, max_lat = bbox
        sql += " AND NOT (lon_max < ? OR lon_min > ? OR lat_max < ? OR lat_min > ?)"
        params.extend([min_lon, max_lon, min_lat, max_lat])
    sql += " ORDER BY created_at DESC"
    try:
        return _fetch_dicts(con, sql, params)
    except Exception:
        return []


def delete_dynamic_hazard(con: duckdb.DuckDBPyConnection, hazard_id: str) -> bool:
    """Deactivate or remove a dynamic hazard by ID."""
    init_dynamic_hazards_table(con)
    try:
        rows = con.execute("DELETE FROM dynamic_hazards WHERE hazard_id = ? RETURNING hazard_id", [hazard_id]).fetchall()
        return len(rows) > 0
    except Exception:
        return False
