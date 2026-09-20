CREATE TABLE IF NOT EXISTS sources (
    source_id VARCHAR PRIMARY KEY,
    kind VARCHAR NOT NULL,
    coverage VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    notes VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS stations (
    name VARCHAR PRIMARY KEY,
    river VARCHAR NOT NULL,
    lon DOUBLE NOT NULL,
    lat DOUBLE NOT NULL,
    method VARCHAR NOT NULL,
    n_days INTEGER NOT NULL,
    n_years INTEGER NOT NULL,
    year_range VARCHAR NOT NULL,
    source_id VARCHAR NOT NULL REFERENCES sources(source_id),
    validation_issues VARCHAR NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS station_annual_maxima (
    station_name VARCHAR NOT NULL REFERENCES stations(name),
    year INTEGER NOT NULL,
    qmax DOUBLE NOT NULL,
    PRIMARY KEY (station_name, year)
);

CREATE TABLE IF NOT EXISTS station_stats (
    station_name VARCHAR PRIMARY KEY REFERENCES stations(name),
    qmin DOUBLE NOT NULL,
    qmax DOUBLE NOT NULL,
    qmean DOUBLE NOT NULL
);

CREATE TABLE IF NOT EXISTS station_fit (
    station_name VARCHAR PRIMARY KEY REFERENCES stations(name),
    fit_method VARCHAR NOT NULL,
    c DOUBLE,
    loc DOUBLE NOT NULL,
    scale DOUBLE NOT NULL,
    t3 DOUBLE NOT NULL,
    t4 DOUBLE NOT NULL,
    n_years INTEGER NOT NULL,
    n_bootstrap INTEGER NOT NULL DEFAULT 2000,
    bootstrap_seed INTEGER NOT NULL DEFAULT 42
);

CREATE TABLE IF NOT EXISTS station_return_periods (
    station_name VARCHAR NOT NULL REFERENCES stations(name),
    rp_key VARCHAR NOT NULL,
    rp_years DOUBLE NOT NULL,
    q_discharge DOUBLE NOT NULL,
    PRIMARY KEY (station_name, rp_key)
);

CREATE TABLE IF NOT EXISTS station_ci (
    station_name VARCHAR NOT NULL,
    rp_key VARCHAR NOT NULL,
    ci_mean DOUBLE NOT NULL,
    ci_p5 DOUBLE NOT NULL,
    ci_p50 DOUBLE NOT NULL,
    ci_p95 DOUBLE NOT NULL,
    cv_pct DOUBLE NOT NULL,
    PRIMARY KEY (station_name, rp_key)
);

CREATE TABLE IF NOT EXISTS station_monthly (
    station_name VARCHAR NOT NULL REFERENCES stations(name),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    mean DOUBLE NOT NULL,
    p10 DOUBLE NOT NULL,
    p50 DOUBLE NOT NULL,
    p90 DOUBLE NOT NULL,
    max_val DOUBLE NOT NULL,
    n_days INTEGER NOT NULL,
    PRIMARY KEY (station_name, month)
);

CREATE TABLE IF NOT EXISTS station_seasonal (
    station_name VARCHAR NOT NULL REFERENCES stations(name),
    season VARCHAR NOT NULL CHECK (season IN ('monsoon', 'dry')),
    n_years INTEGER NOT NULL,
    fit_method VARCHAR NOT NULL,
    t3 DOUBLE NOT NULL,
    rp_key VARCHAR NOT NULL,
    rp_years DOUBLE NOT NULL,
    q_discharge DOUBLE NOT NULL,
    PRIMARY KEY (station_name, season, rp_key)
);

CREATE TABLE IF NOT EXISTS gauge_cells (
    gauge VARCHAR PRIMARY KEY,
    river VARCHAR NOT NULL,
    gauge_lon DOUBLE NOT NULL,
    gauge_lat DOUBLE NOT NULL,
    cell_lon DOUBLE NOT NULL,
    cell_lat DOUBLE NOT NULL,
    q_forecast DOUBLE NOT NULL,
    expected_q DOUBLE NOT NULL,
    status VARCHAR NOT NULL,
    offset_dx DOUBLE NOT NULL,
    offset_dy DOUBLE NOT NULL,
    source_id VARCHAR NOT NULL REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS logistics_points (
    name VARCHAR PRIMARY KEY,
    river VARCHAR NOT NULL,
    orig_lon DOUBLE NOT NULL,
    orig_lat DOUBLE NOT NULL,
    cell_lon DOUBLE NOT NULL,
    cell_lat DOUBLE NOT NULL,
    q_forecast DOUBLE NOT NULL,
    status VARCHAR NOT NULL,
    method VARCHAR NOT NULL,
    anchor_gauge VARCHAR REFERENCES gauge_cells(gauge),
    direct_q DOUBLE,
    anchor_q DOUBLE,
    source_id VARCHAR NOT NULL REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS corridors (
    corridor_id INTEGER PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    highways VARCHAR NOT NULL,
    has_reroute BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS corridor_points (
    corridor_id INTEGER NOT NULL REFERENCES corridors(corridor_id),
    point_name VARCHAR NOT NULL,
    river VARCHAR NOT NULL,
    lon DOUBLE NOT NULL,
    lat DOUBLE NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('chokepoint', 'watch', 'secondary')),
    PRIMARY KEY (corridor_id, point_name)
);

CREATE TABLE IF NOT EXISTS structures (
    structure_id INTEGER PRIMARY KEY,
    kind VARCHAR NOT NULL CHECK (kind IN ('dam', 'embankment', 'bridge')),
    name VARCHAR NOT NULL,
    river VARCHAR NOT NULL,
    lon DOUBLE,
    lat DOUBLE,
    notes VARCHAR NOT NULL,
    status VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    name VARCHAR PRIMARY KEY,
    year INTEGER NOT NULL,
    anchor_gauge VARCHAR NOT NULL,
    peak_q DOUBLE NOT NULL,
    impact VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS road_ways (
    way_id BIGINT PRIMARY KEY,
    aoi VARCHAR NOT NULL,
    highway VARCHAR,
    ref VARCHAR,
    name VARCHAR,
    bridge VARCHAR,
    lon_min DOUBLE,
    lon_max DOUBLE,
    lat_min DOUBLE,
    lat_max DOUBLE,
    n_nodes INTEGER,
    fetched_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS road_segments (
    segment_id INTEGER PRIMARY KEY,
    highway VARCHAR NOT NULL,
    segment VARCHAR NOT NULL,
    river VARCHAR NOT NULL,
    threshold_station VARCHAR NOT NULL REFERENCES stations(name),
    threshold_q DOUBLE NOT NULL,
    notes VARCHAR NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS forecast_run_seq START 1;

CREATE TABLE IF NOT EXISTS forecast_runs (
    run_id INTEGER PRIMARY KEY DEFAULT nextval('forecast_run_seq'),
    run_at TIMESTAMP NOT NULL,
    horizon_days INTEGER NOT NULL,
    source_id VARCHAR NOT NULL REFERENCES sources(source_id),
    notes VARCHAR NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS forecast_points (
    run_id INTEGER NOT NULL REFERENCES forecast_runs(run_id),
    station_name VARCHAR NOT NULL,
    day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
    q_mean DOUBLE NOT NULL,
    q_control DOUBLE NOT NULL,
    q_p10 DOUBLE NOT NULL,
    q_p50 DOUBLE NOT NULL,
    q_p90 DOUBLE NOT NULL,
    n_members INTEGER NOT NULL,
    p_rp2 DOUBLE NOT NULL,
    p_rp5 DOUBLE NOT NULL,
    p_rp10 DOUBLE NOT NULL,
    risk VARCHAR NOT NULL CHECK (risk IN ('OK', 'WATCH', 'HIGH', 'CRITICAL')),
    trend VARCHAR NOT NULL CHECK (trend IN ('RISING', 'STABLE', 'FALLING')),
    rp2 DOUBLE NOT NULL,
    rp5 DOUBLE NOT NULL,
    rp10 DOUBLE NOT NULL,
    PRIMARY KEY (run_id, station_name, day)
);

CREATE TABLE IF NOT EXISTS corridor_assessments (
    run_id INTEGER NOT NULL REFERENCES forecast_runs(run_id),
    corridor_id INTEGER NOT NULL REFERENCES corridors(corridor_id),
    risk VARCHAR NOT NULL CHECK (risk IN ('OK', 'WATCH', 'HIGH', 'CRITICAL')),
    action VARCHAR NOT NULL CHECK (action IN ('PROCEED', 'MONITOR', 'DELAY', 'REROUTE', 'HOLD')),
    worst_point VARCHAR NOT NULL DEFAULT '',
    worst_p_rp5 DOUBLE NOT NULL DEFAULT 0.0,
    summary VARCHAR NOT NULL DEFAULT '',
    PRIMARY KEY (run_id, corridor_id)
);

CREATE TABLE IF NOT EXISTS hazard_signals (
    run_id INTEGER NOT NULL REFERENCES forecast_runs(run_id),
    layer VARCHAR NOT NULL CHECK (layer IN ('river', 'landslide', 'embankment', 'dam', 'road')),
    target VARCHAR NOT NULL,
    prob DOUBLE NOT NULL,
    risk VARCHAR NOT NULL,
    details VARCHAR NOT NULL DEFAULT '',
    PRIMARY KEY (run_id, layer, target)
);

CREATE TABLE IF NOT EXISTS observations (
    obs_at TIMESTAMP NOT NULL,
    gauge VARCHAR NOT NULL REFERENCES gauge_cells(gauge),
    level_m DOUBLE,
    discharge DOUBLE,
    source_id VARCHAR NOT NULL REFERENCES sources(source_id),
    PRIMARY KEY (obs_at, gauge)
);

CREATE TABLE IF NOT EXISTS weather_signals (
    run_id INTEGER NOT NULL,
    gauge VARCHAR NOT NULL,
    rain_24h DOUBLE NOT NULL,
    rain_3d DOUBLE NOT NULL,
    rain_7d_fcst DOUBLE NOT NULL,
    risk VARCHAR NOT NULL CHECK (risk IN ('OK', 'WATCH', 'HIGH')),
    PRIMARY KEY (run_id, gauge)
);

CREATE TABLE IF NOT EXISTS weather_forecast_grid (
    point_id VARCHAR PRIMARY KEY,
    point_name VARCHAR NOT NULL,
    corridor_id INTEGER,
    river VARCHAR,
    lon DOUBLE NOT NULL,
    lat DOUBLE NOT NULL,
    rain_24h DOUBLE NOT NULL DEFAULT 0.0,
    rain_3d DOUBLE NOT NULL DEFAULT 0.0,
    rain_7d_fcst DOUBLE NOT NULL DEFAULT 0.0,
    current_rain_mm_h DOUBLE NOT NULL DEFAULT 0.0,
    current_visibility_m DOUBLE NOT NULL DEFAULT 10000.0,
    current_wind_gust_kmh DOUBLE NOT NULL DEFAULT 0.0,
    hourly_precipitation VARCHAR NOT NULL DEFAULT '[]',
    hourly_visibility VARCHAR NOT NULL DEFAULT '[]',
    hourly_weather_code VARCHAR NOT NULL DEFAULT '[]',
    hourly_wind_gust VARCHAR NOT NULL DEFAULT '[]',
    hourly_time VARCHAR NOT NULL DEFAULT '[]',
    min_visibility_m DOUBLE NOT NULL DEFAULT 10000.0,
    max_wind_gust_kmh DOUBLE NOT NULL DEFAULT 0.0,
    risk VARCHAR NOT NULL DEFAULT 'OK' CHECK (risk IN ('OK', 'WATCH', 'HIGH', 'CRITICAL')),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_state (
    alert_key VARCHAR PRIMARY KEY,
    level VARCHAR NOT NULL,
    fired_at TIMESTAMP NOT NULL,
    cooldown_until TIMESTAMP NOT NULL
);

CREATE OR REPLACE VIEW v_latest_corridors AS
WITH latest AS (
    SELECT MAX(run_id) AS run_id FROM forecast_runs
)
SELECT 
    c.corridor_id,
    c.name,
    c.highways,
    c.has_reroute,
    ca.risk,
    ca.action,
    ca.worst_point,
    ca.worst_p_rp5,
    ca.summary,
    fr.run_at
FROM corridors c
JOIN latest l ON true
JOIN corridor_assessments ca ON ca.corridor_id = c.corridor_id AND ca.run_id = l.run_id
JOIN forecast_runs fr ON fr.run_id = l.run_id
ORDER BY c.corridor_id;

CREATE OR REPLACE VIEW v_gauge_stress_monitor AS
WITH latest AS (
    SELECT MAX(run_id) AS run_id FROM forecast_runs
)
SELECT 
    gc.gauge,
    gc.river,
    gc.cell_lon,
    gc.cell_lat,
    fp.day,
    fp.q_mean,
    fp.q_p50,
    fp.q_p90,
    ROUND(fp.q_mean / NULLIF(srp.q_discharge, 0), 3) AS load_ratio_rp5,
    fp.p_rp5,
    fp.risk AS hydro_risk,
    fp.trend,
    COALESCE(ws.rain_24h, 0) AS rain_24h_mm,
    COALESCE(ws.rain_3d, 0) AS rain_3d_mm,
    COALESCE(ws.risk, 'OK') AS weather_risk
FROM gauge_cells gc
JOIN latest l ON true
LEFT JOIN forecast_points fp ON fp.station_name = gc.gauge AND fp.run_id = l.run_id AND fp.day = 2
LEFT JOIN station_return_periods srp ON srp.station_name = gc.gauge AND srp.rp_key = 'rp5'
LEFT JOIN weather_signals ws ON ws.gauge = gc.gauge AND ws.run_id = l.run_id;

CREATE TABLE IF NOT EXISTS sachet_alerts (
    identifier VARCHAR PRIMARY KEY,
    sender VARCHAR NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    effective_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    event VARCHAR NOT NULL,
    severity VARCHAR NOT NULL,
    urgency VARCHAR NOT NULL,
    certainty VARCHAR NOT NULL,
    headline VARCHAR NOT NULL,
    instruction VARCHAR NOT NULL DEFAULT '',
    area_desc VARCHAR NOT NULL DEFAULT '',
    polygon_wkt VARCHAR NOT NULL,
    geom GEOMETRY,
    ingested_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mountain_corridor_geoms (
    corridor_id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    baseline_susceptibility DOUBLE NOT NULL,
    geom GEOMETRY,
    notes VARCHAR NOT NULL DEFAULT ''
);

CREATE OR REPLACE VIEW v_active_sachet_alerts AS
SELECT 
    identifier,
    event,
    severity,
    urgency,
    certainty,
    headline,
    instruction,
    area_desc,
    polygon_wkt,
    geom,
    effective_at,
    expires_at
FROM sachet_alerts
WHERE expires_at > now() OR expires_at IS NULL;

CREATE OR REPLACE VIEW v_corridor_weather_summary AS
SELECT 
    c.corridor_id,
    c.name AS corridor_name,
    c.highways,
    COUNT(w.point_id) AS total_monitored_points,
    ROUND(COALESCE(MAX(w.rain_24h), 0.0), 1) AS max_rain_24h_mm,
    ROUND(COALESCE(MAX(w.rain_3d), 0.0), 1) AS max_rain_3d_mm,
    ROUND(COALESCE(MAX(w.current_rain_mm_h), 0.0), 1) AS max_current_rain_mm_h,
    ROUND(COALESCE(MIN(w.min_visibility_m), 10000.0), 1) AS min_visibility_m,
    ROUND(COALESCE(MAX(w.max_wind_gust_kmh), 0.0), 1) AS max_wind_gust_kmh,
    CASE 
        WHEN COALESCE(MAX(w.rain_24h), 0.0) >= 100.0 OR COALESCE(MIN(w.min_visibility_m), 10000.0) < 150.0 OR COALESCE(MAX(w.current_rain_mm_h), 0.0) >= 35.0 THEN 'CRITICAL'
        WHEN COALESCE(MAX(w.rain_24h), 0.0) >= 50.0 OR COALESCE(MIN(w.min_visibility_m), 10000.0) < 500.0 OR COALESCE(MAX(w.current_rain_mm_h), 0.0) >= 7.5 THEN 'HIGH'
        WHEN COALESCE(MAX(w.rain_24h), 0.0) >= 25.0 OR COALESCE(MIN(w.min_visibility_m), 10000.0) < 1000.0 OR COALESCE(MAX(w.current_rain_mm_h), 0.0) >= 2.5 THEN 'WATCH'
        ELSE 'OK'
    END AS weather_risk,
    COALESCE((
        SELECT w2.point_name FROM weather_forecast_grid w2 
        WHERE w2.corridor_id = c.corridor_id 
        ORDER BY w2.rain_24h DESC, w2.min_visibility_m ASC LIMIT 1
    ), 'none') AS worst_point
FROM corridors c
LEFT JOIN weather_forecast_grid w ON w.corridor_id = c.corridor_id
GROUP BY c.corridor_id, c.name, c.highways
ORDER BY c.corridor_id;

CREATE TABLE IF NOT EXISTS dynamic_hazards (
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
);


