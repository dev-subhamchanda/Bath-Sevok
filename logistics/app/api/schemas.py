"""Pydantic request and response validation schemas for multi-hazard routing."""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


VehicleProfileLiteral = Literal[
    "light_commercial",
    "intermediate_truck",
    "medium_truck",
    "heavy_multi_axle",
    "tractor_trailer",
    "tanker_empty",
    "tanker_laden",
    "high_mobility_4x4",
    "heavy_truck",
    "tanker",
]


class BaseResponse(BaseModel):
    """Base response model permitting passthrough of dynamic geospatial attributes."""
    model_config = ConfigDict(extra="allow")


class RouteRequest(BaseModel):
    points: List[List[float]] = Field(min_length=2, max_length=20000)
    day: int = Field(default=2, ge=0, le=6)
    max_samples: int = Field(default=40, ge=1, le=200)
    vehicle_profile: VehicleProfileLiteral = "heavy_truck"
    fleet: Optional[List[VehicleProfileLiteral]] = None


class RouteCandidate(BaseModel):
    route_id: str = Field(min_length=1, max_length=80)
    points: List[List[float]] = Field(min_length=2, max_length=20000)


class ScoreRequest(BaseModel):
    routes: List[RouteCandidate] = Field(min_length=1, max_length=10)
    day: int = Field(default=2, ge=0, le=6)
    max_samples: int = Field(default=40, ge=1, le=200)
    vehicle_profile: VehicleProfileLiteral = "heavy_truck"
    fleet: Optional[List[VehicleProfileLiteral]] = None


class DispatchRequest(BaseModel):
    start: List[float] = Field(min_length=2, max_length=2)
    end: List[float] = Field(min_length=2, max_length=2)
    day: int = Field(default=2, ge=0, le=6)
    max_samples: int = Field(default=40, ge=1, le=200)
    alternates: int = Field(default=2, ge=0, le=3)
    provider: Literal["ors", "tomtom"] = "ors"
    vehicle_profile: VehicleProfileLiteral = "heavy_truck"
    fleet: Optional[List[VehicleProfileLiteral]] = None
    ors_key: Optional[str] = Field(default=None, min_length=10, max_length=200)
    tomtom_key: Optional[str] = Field(default=None, min_length=10, max_length=200)
    routes: List[RouteCandidate] = Field(default_factory=list, max_length=10)
    hazard_points: Optional[List[Any]] = Field(
        default=None,
        description="Direct list of hazard points [lon, lat], pairs [[lon1, lat1], [lon2, lat2]], or point objects",
    )
    hazard_pairs: Optional[List[Any]] = Field(
        default=None,
        description="Optional list of hazard point pairs ([[lon1, lat1], [lon2, lat2]]) defining road hazard segments",
    )
    avoid_boxes: Optional[List[List[float]]] = Field(
        default=None,
        description="Optional list of bounding boxes [[min_lon, min_lat, max_lon, max_lat], ...] to avoid during routing",
    )
    avoid_polygons: Optional[List[List[List[float]]]] = Field(
        default=None,
        description="Optional list of polygon coordinate rings [[[lon, lat], ...], ...] to avoid during routing",
    )
    avoid_points: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional list of hazard points [{'lon': float, 'lat': float, 'radius_km': float}, ...] to avoid",
    )
    include_local_hazards: bool = Field(
        default=False,
        description="Optional: whether to query and include active hazards from local dynamic_hazards database (default: False)",
    )


# Response Models

class RouteLeg(BaseResponse):
    lon: float
    lat: float
    km_from_start: float
    eval_day: int
    gauge: str
    river: str
    gauge_km: float
    crossing: Optional[str] = None
    clearance_m: float
    load_ratio: float
    bankfull_excess: float
    inundation_depth_m: float
    risk: str
    reason: str
    closure_likelihood: float
    precipitation_mm_h: Optional[float] = None
    rain_class: Optional[str] = None
    visibility_m: Optional[float] = None
    visibility_class: Optional[str] = None
    wind_gust_kmh: Optional[float] = None
    weather_condition: Optional[str] = None
    nearest_weather_point: Optional[str] = None


class WorstBottleneck(BaseResponse):
    gauge: str
    crossing: Optional[str] = None
    risk: str
    p_rp5: float
    bankfull_excess: float
    inundation_depth_m: float


class FirstBlocker(BaseResponse):
    km: float
    location: str
    river: str
    risk: str
    vehicle_profile: str
    reason: str
    closure_likelihood: float


class StagingNode(BaseResponse):
    name: str
    km: float
    role: str


class DispatchWindow(BaseResponse):
    is_receding: bool
    safe_departure_day: Optional[int] = None
    estimated_wait_hours: Optional[float] = None
    projected_verdict: Optional[str] = None
    message: str


class VehicleEvaluation(BaseResponse):
    verdict: str
    action: str
    is_passable: bool
    operating_speed_kmh: float
    elapsed_transit_hours: float
    first_blocker: Optional[Dict[str, Any]] = None


class FleetSummary(BaseResponse):
    convoy_verdict: str
    convoy_passable: bool
    convoy_speed_kmh: float
    convoy_transit_hours: float
    limiting_vehicle: str
    limiting_reason: str
    vehicle_evaluations: Dict[str, Any]


class RainWindow(BaseResponse):
    km_start: float
    km_end: float
    length_km: float
    arrival_start_hours: float
    arrival_end_hours: float
    arrival_start_time: Optional[datetime] = None
    arrival_end_time: Optional[datetime] = None
    arrival_window: Optional[str] = None
    max_rain_rate_mm_h: float
    rain_class: str
    condition: str
    location: str


class FogSection(BaseResponse):
    km_start: float
    km_end: float
    length_km: float
    arrival_start_hours: float
    arrival_end_hours: float
    arrival_start_time: Optional[datetime] = None
    arrival_end_time: Optional[datetime] = None
    arrival_window: Optional[str] = None
    min_visibility_m: float
    visibility_class: str
    location: str


class CrosswindSection(BaseResponse):
    km: float
    arrival_start_hours: float
    arrival_end_hours: float
    arrival_start_time: Optional[datetime] = None
    arrival_end_time: Optional[datetime] = None
    arrival_window: Optional[str] = None
    wind_gust_kmh: float
    location: str
    warning: str


class WeatherSummary(BaseResponse):
    has_active_rain: bool
    rain_distance_km: float
    max_rain_rate_mm_h: float
    min_visibility_m: float
    visibility_verdict: str
    max_wind_gust_kmh: float
    rain_windows: List[RainWindow] = Field(default_factory=list)
    fog_sections: List[FogSection] = Field(default_factory=list)
    high_crosswind_sections: List[CrosswindSection] = Field(default_factory=list)


class HazardHit(BaseResponse):
    hazard_id: str
    name: str
    hazard_type: str = "roadblock"
    severity: str = "CRITICAL"
    km_from_start: Optional[float] = None
    location: Optional[str] = None
    bbox: Optional[List[float]] = None


class ScoredRoute(BaseResponse):
    route_id: str
    coordinates: List[List[float]] = Field(default_factory=list, description="Full route polyline [[lon, lat], ...]")
    total_distance_km: float
    duration_min: Optional[float] = None
    elapsed_transit_hours: float
    operating_speed_kmh: float
    terrain_class: str
    verdict: str
    action: str
    closure_likelihood: float
    p_flood: float
    p_landslide: float
    p_roadblock: float
    primary_hazard: str
    worst: WorstBottleneck
    first_blocker: Optional[FirstBlocker] = None
    safe_staging_km: float
    safe_staging_node: Optional[StagingNode] = None
    dispatch_window: Optional[DispatchWindow] = None
    fleet_summary: Optional[FleetSummary] = None
    weather_summary: Optional[WeatherSummary] = None
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    intersected_hazards: List[HazardHit] = Field(default_factory=list)
    legs: List[RouteLeg] = Field(default_factory=list)


class RouteRisk(BaseResponse):
    run_id: int
    day: int
    vehicle_profile: str
    sampled: int
    total_distance_km: float
    elapsed_transit_hours: float
    operating_speed_kmh: float
    terrain_class: str
    verdict: str
    action: str
    closure_likelihood: float
    p_flood: float
    p_landslide: float
    p_roadblock: float
    primary_hazard: str
    worst: WorstBottleneck
    first_blocker: Optional[FirstBlocker] = None
    safe_staging_km: float
    safe_staging_node: Optional[StagingNode] = None
    dispatch_window: Optional[DispatchWindow] = None
    weather_summary: Optional[WeatherSummary] = None
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    intersected_hazards: List[HazardHit] = Field(default_factory=list)
    legs: List[RouteLeg] = Field(default_factory=list)


class ScoreResponse(BaseResponse):
    run_id: int
    day: int
    vehicle_profile: str
    recommendation: str
    ranking: List[str]
    routes: List[ScoredRoute]


class DispatchResponse(BaseResponse):
    run_id: int
    day: int
    start: List[float]
    end: List[float]
    vehicle_profile: str
    recommendation: str
    ranking: List[str]
    routes: List[ScoredRoute]
    intersected_hazards: List[HazardHit] = Field(default_factory=list)


class HazardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    hazard_type: str = Field(default="roadblock", description="Hazard type: flood, landslide, roadblock, construction")
    severity: str = Field(default="CRITICAL", description="Severity floor: WATCH, HIGH, CRITICAL")
    point: Optional[List[float]] = Field(default=None, min_length=2, max_length=2, description="[lon, lat]")
    radius_km: Optional[float] = Field(default=2.5, ge=0.1, le=50.0)
    bbox: Optional[List[float]] = Field(default=None, min_length=4, max_length=4, description="[min_lon, min_lat, max_lon, max_lat]")
    polygon: Optional[List[List[float]]] = Field(default=None, min_length=3, description="List of [lon, lat] boundary vertices")
    expires_hours: Optional[float] = Field(default=24.0, ge=0.5, le=720.0, description="TTL duration in hours")


class HazardItem(BaseResponse):
    hazard_id: str
    name: str
    geometry_type: str
    lon_min: float
    lat_min: float
    lon_max: float
    lat_max: float
    polygon_geojson: Optional[str] = None
    radius_km: float
    hazard_type: str
    severity: str
    active: bool
    created_at: Optional[Any] = None
    expires_at: Optional[Any] = None


class HazardList(BaseResponse):
    total: int
    hazards: List[HazardItem]


class HazardDelete(BaseResponse):
    deleted: bool
    hazard_id: str


class AlertItem(BaseResponse):
    key: str
    target: str
    risk: str
    action: str
    worst_point: Optional[str] = ""
    prob: float = 0.0
    detail: Optional[str] = ""
    corridor_id: Optional[int] = None
    weather: Optional[Dict[str, Any]] = None


class AlertList(BaseResponse):
    run_id: int
    floor: str
    alerts: List[AlertItem]


class HealthResponse(BaseResponse):
    ok: bool
    db: str
    latest_run: int


class CorridorSummary(BaseResponse):
    corridor_id: int
    name: str
    highways: str
    has_reroute: bool
    risk: str
    action: str
    worst_point: str
    worst_p_rp5: float
    summary: str


class CorridorList(BaseResponse):
    run_id: int
    corridors: List[CorridorSummary]


class WeatherPoint(BaseResponse):
    point_id: str
    point_name: str
    river: Optional[str] = None
    lon: float
    lat: float
    rain_24h: float
    rain_3d: float
    rain_7d_fcst: float
    current_rain_mm_h: float
    current_visibility_m: float
    current_wind_gust_kmh: float
    min_visibility_m: float
    max_wind_gust_kmh: float
    risk: str
    updated_at: Optional[Any] = None


class WeatherDetail(BaseResponse):
    corridor_id: int
    corridor_name: str
    highways: str
    total_monitored_points: int
    max_rain_24h_mm: float
    max_rain_3d_mm: float
    max_current_rain_mm_h: float
    min_visibility_m: float
    max_wind_gust_kmh: float
    weather_risk: str
    worst_point: str
    points: List[WeatherPoint] = Field(default_factory=list)


class CorridorWeather(BaseResponse):
    corridor_id: int
    corridor_name: str
    highways: str
    total_monitored_points: int
    max_rain_24h_mm: float
    max_rain_3d_mm: float
    max_current_rain_mm_h: float
    min_visibility_m: float
    max_wind_gust_kmh: float
    weather_risk: str
    worst_point: str


class WeatherList(BaseResponse):
    corridors: List[CorridorWeather]


class WeatherRequest(BaseModel):
    points: List[List[float]] = Field(min_length=2, max_length=20000)
    departure_time: Optional[str] = None
    max_samples: int = Field(default=40, ge=1, le=200)
    operating_speed_kmh: Optional[float] = None
    live: bool = False


class WeatherResponse(BaseResponse):
    total_distance_km: float
    weather_summary: WeatherSummary
    legs: List[RouteLeg]
