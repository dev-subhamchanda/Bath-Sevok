"""Central application settings and environment configuration.

All tunable parameters, timeouts, and thresholds are unified here using Pydantic.
Defaults are provided for local execution and can be overridden via environment variables.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent


class ServerSettings(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000
    db_path: Path = BASE_DIR / "data" / "ne_india.duckdb"
    enable_worker: bool = True
    retention_days: int = 30
    cors_origins: List[str] = ["*"]


class FloodSettings(BaseModel):
    api_url: str = "https://flood-api.open-meteo.com/v1/flood"
    forecast_days: int = 7
    primary_day: int = 2
    small_river_threshold: float = 100.0  # m3/s; below this GloFAS has high relative noise
    risk_threshold_prob: float = 0.5      # P(Q > RP) > 50% triggers the risk level
    season: str = "auto"                  # 'auto', 'annual', 'monsoon', 'dry'


class WeatherSettings(BaseModel):
    api_url: str = "https://api.open-meteo.com/v1/forecast"
    past_days: int = 3
    forecast_days: int = 7
    rain_watch_mm: float = 50.0           # 24h rainfall (mm) triggering WATCH
    rain_high_mm: float = 100.0          # 24h rainfall (mm) triggering HIGH
    rain_3d_high_mm: float = 150.0       # 72h rainfall (mm) triggering HIGH
    poll_interval_hours: int = 1


class RoutingSettings(BaseModel):
    ors_api_url: str = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    ors_api_key: Optional[str] = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ2ZmI3N2E5ZWY0ODRmMGRiMTAxYzA0ZWQ4OGU0MGJmIiwiaCI6Im11cm11cjY0In0="
    tomtom_api_url: str = "https://api.tomtom.com/routing/1/calculateRoute"
    tomtom_api_key: Optional[str] = None
    max_samples: int = 40
    max_gauge_distance_km: float = 10.0   # Maximum radius to associate coordinate with river reach
    crossing_buffer_km: float = 2.5       # Proximity threshold to identify critical bridge/crossing


class AlertSettings(BaseModel):
    webhooks: List[str] = Field(default_factory=list)
    cooldown_hours: float = 6.0
    webhook_timeout: float = 15.0
    webhook_retries: int = 2
    default_floor: str = "WATCH"          # Minimum severity to fire alert ('WATCH', 'HIGH', 'CRITICAL')
    poll_interval_sec: int = 60           # Cadence for alert evaluation loop in seconds


class LandslideSettings(BaseModel):
    lhasa_api_url: str = "https://gis.earthdata.nasa.gov/portal/rest/services/Landslides"
    lhasa_timeout: float = 10.0
    sachet_rss_url: str = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml"
    sachet_poll_interval_minutes: int = 10
    rainfall_trigger_watch_mm: float = 30.0
    rainfall_trigger_high_mm: float = 60.0
    rainfall_trigger_extreme_mm: float = 100.0
    seismic_floor: float = 0.02
    segment_length_km: float = 5.0
    lhasa_cache_ttl_hours: int = 6


class Settings(BaseModel):
    server: ServerSettings = Field(default_factory=ServerSettings)
    flood: FloodSettings = Field(default_factory=FloodSettings)
    weather: WeatherSettings = Field(default_factory=WeatherSettings)
    routing: RoutingSettings = Field(default_factory=RoutingSettings)
    alerts: AlertSettings = Field(default_factory=AlertSettings)
    landslide: LandslideSettings = Field(default_factory=LandslideSettings)

    @classmethod
    def load(cls) -> Settings:
        """Load settings from environment variables with sensible defaults."""
        db_path_env = os.getenv("DB_PATH")
        db_path = Path(db_path_env) if db_path_env else BASE_DIR / "data" / "ne_india.duckdb"

        webhooks_env = os.getenv("ALERT_WEBHOOKS", "")
        webhooks = [u.strip() for u in webhooks_env.split(",") if u.strip()]

        return cls(
            server=ServerSettings(
                host=os.getenv("SERVER_HOST", "0.0.0.0"),
                port=int(os.getenv("SERVER_PORT", "8000")),
                db_path=db_path,
                enable_worker=os.getenv("ENABLE_WORKER", "true").lower() in ("true", "1", "yes"),
                retention_days=int(os.getenv("RETENTION_DAYS", "30")),
            ),
            flood=FloodSettings(
                forecast_days=int(os.getenv("FLOOD_FORECAST_DAYS", "7")),
                primary_day=int(os.getenv("FLOOD_PRIMARY_DAY", "2")),
                season=os.getenv("FLOOD_SEASON", "auto"),
            ),
            weather=WeatherSettings(
                poll_interval_hours=int(os.getenv("WEATHER_POLL_INTERVAL_HOURS", "1")),
            ),
            routing=RoutingSettings(
                ors_api_key=os.getenv("ORS_API_KEY", "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ2ZmI3N2E5ZWY0ODRmMGRiMTAxYzA0ZWQ4OGU0MGJmIiwiaCI6Im11cm11cjY0In0="),
                tomtom_api_key=os.getenv("TOMTOM_KEY"),
                max_samples=int(os.getenv("MAX_ROUTE_SAMPLES", "40")),
            ),
            alerts=AlertSettings(
                webhooks=webhooks,
                cooldown_hours=float(os.getenv("ALERT_COOLDOWN_HOURS", "6.0")),
                default_floor=os.getenv("ALERT_DEFAULT_FLOOR", "WATCH"),
                poll_interval_sec=int(os.getenv("ALERT_POLL_INTERVAL_SEC", "60")),
            ),
            landslide=LandslideSettings(
                lhasa_timeout=float(os.getenv("LHASA_TIMEOUT", "10.0")),
                seismic_floor=float(os.getenv("SEISMIC_FLOOR", "0.02")),
            ),
        )


settings = Settings.load()
