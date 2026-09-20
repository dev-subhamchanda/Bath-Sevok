# Logistics Module

Flood-aware route scoring and dispatch engine for Northeast India. Evaluates road passability against real-time river discharge forecasts (GloFAS v4), weather conditions, landslide susceptibility, and dynamic roadblocks.

## Quick Start

```bash
cd logistics
pip install -e .
uvicorn app.api.server:app --host 0.0.0.0 --port 8000
```

Requires a DuckDB database at `data/ne_india.duckdb` (built from `data/schema.sql` + GloFAS ingestion pipeline).

## What It Does

```
Origin/Destination
  -> ORS/TomTom routing (2-3 alternate polylines)
  -> polyline sampling (40 points)
  -> nearest gauge matching (CWC stations)
  -> GloFAS discharge forecast (7-day ensemble)
  -> return period exceedance probability (GEV/Gumbel L-moments)
  -> weather overlay (rain, fog, crosswind from Open-Meteo)
  -> spatial hazard intersection (SACHET alerts, landslides, dynamic roadblocks)
  -> per-vehicle hydraulic scoring (8 profiles with calibrated thresholds)
  -> ranked routes with verdicts
```

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service liveness, latest forecast run |
| `/corridors` | GET | 37 monitored freight corridors with risk status |
| `/dispatch` | POST | Full pipeline: route, score, weather, rank |
| `/score-routes` | POST | Score pre-computed route polylines |
| `/route-risk` | POST | Score an arbitrary GPS polyline |
| `/alerts` | GET | Currently firing threshold alerts |
| `/alerts/stream` | GET | SSE live alert feed |
| `/hazards` | GET/POST/DELETE | Dynamic roadblock registry |
| `/weather/route` | POST | Spatiotemporal weather profile along a route |
| `/weather/points` | GET | Weather data across all monitoring stations |
| `/segments` | GET | Road segments with hydraulic closure thresholds |
| `/features` | POST | ML feature tensor extraction |

## Dispatch Example

```bash
curl -X POST http://localhost:8000/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "start": [91.73, 26.14],
    "end": [91.58, 25.57],
    "day": 2,
    "vehicle_profile": "heavy_truck",
    "ors_key": "YOUR_ORS_KEY"
  }'
```

Returns ranked routes with:
- `verdict` - GO / CAUTION / HOLD
- `first_blocker` - first impassable point with km marker
- `coordinates` - full route polyline for map plotting
- `weather_summary` - rain windows, fog sections, crosswind warnings
- `fleet_summary` - convoy evaluation across multiple vehicle types
- `safe_staging_km` - last safe point before danger zone

## Vehicle Profiles

`heavy_truck`, `light_commercial`, `tanker_empty`, `tanker_laden`, `passenger_car`, `bus`, `tractor_trailer`, `4x4_high_mobility`

Each has calibrated hydraulic tolerances (wading depth, stability thresholds). Use `fleet` to test multiple at once.

## Architecture

```
app/
  api/           FastAPI endpoints + Pydantic schemas
  db/            DuckDB connection manager + query layer
  modules/
    alerts/      Alert bus (pub/sub), cooldown, SSE, webhooks
    flood/       GloFAS ensemble client, exceedance analysis
    landslide/   NDMA SACHET parser, NASA LHASA client, spatial eval
    risk/        Route scoring engine, hydraulics, geo utilities
    routing/     ORS/TomTom clients, hazard normalization, polygon avoidance
    weather/     Open-Meteo client, rainfall classification, route profiling
  worker/        Background scheduler (weather polling, alert evaluation)
tests/           Hypothesis property tests + integration tests
```

## Tech Stack

- **Runtime**: Python 3.12+, FastAPI, uvicorn
- **Database**: DuckDB (analytics, spatial queries via `spatial` extension)
- **Routing**: OpenRouteService / TomTom
- **Hydrology**: GloFAS v4 via Open-Meteo Flood API
- **Weather**: Open-Meteo API
- **Alerts**: NDMA SACHET CAP XML feeds, NASA LHASA landslide API
