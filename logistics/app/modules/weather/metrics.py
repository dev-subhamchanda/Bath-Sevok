"""Rainfall accumulation, visibility classification, and spatiotemporal route weather profile."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional

from app.settings import settings


def classify_rain_risk(
    rain_24h: float,
    rain_3d: float,
    current_rain_mm_h: float = 0.0,
) -> str:
    """Classify weather risk based on rainfall saturation and intensity thresholds."""
    if (
        rain_24h >= settings.weather.rain_high_mm
        or rain_3d >= settings.weather.rain_3d_high_mm
        or current_rain_mm_h >= 35.0
    ):
        return "CRITICAL" if current_rain_mm_h >= 35.0 or rain_24h >= 150.0 else "HIGH"
    if rain_24h >= settings.weather.rain_watch_mm or current_rain_mm_h >= 7.5:
        return "HIGH" if current_rain_mm_h >= 15.0 else "WATCH"
    if rain_24h >= 25.0 or current_rain_mm_h >= 2.5:
        return "WATCH"
    return "OK"


def classify_visibility(visibility_m: float) -> str:
    """Classify horizontal sight distance under IRC:SP:48 mountain highway standards.

    - CLEAR: > 1000m (nominal transit speed)
    - IMPAIRED: 500m to 1000m (25% speed derating on mountain ghats)
    - POOR_FOG: 150m to 500m (50% speed derating, convoy spacing doubled, zero overtaking)
    - DENSE_FOG_HAZARD: < 150m (SSD violated; mandatory HOLD for heavy trucks / articulated vehicles)
    """
    if visibility_m >= 1000.0:
        return "CLEAR"
    if visibility_m >= 500.0:
        return "IMPAIRED"
    if visibility_m >= 150.0:
        return "POOR_FOG"
    return "DENSE_FOG_HAZARD"


def classify_rain_rate(rain_mm_h: float) -> str:
    """Classify hourly precipitation intensity.

    - DRY: 0.0 mm/h
    - LIGHT: 0.1 to 2.5 mm/h
    - MODERATE: 2.5 to 7.5 mm/h
    - HEAVY: 7.5 to 35.0 mm/h
    - TORRENTIAL_CLOUDBURST: > 35.0 mm/h (pluvial sheet flow, aquaplaning risk)
    """
    if rain_mm_h <= 0.05:
        return "DRY"
    if rain_mm_h <= 2.5:
        return "LIGHT"
    if rain_mm_h <= 7.5:
        return "MODERATE"
    if rain_mm_h <= 35.0:
        return "HEAVY"
    return "TORRENTIAL_CLOUDBURST"


def classify_weather_code(code: int) -> str:
    """Map WMO weather code to standard descriptive condition."""
    if code == 0:
        return "clear_sky"
    if code in (1, 2, 3):
        return "partly_cloudy"
    if code in (45, 48):
        return "fog_mist"
    if code in (51, 53, 55):
        return "drizzle"
    if code in (56, 57):
        return "freezing_drizzle"
    if code in (61, 63, 65):
        return "rain"
    if code in (66, 67):
        return "freezing_rain"
    if code in (71, 73, 75, 77):
        return "snow"
    if code in (80, 81, 82):
        return "rain_showers"
    if code in (85, 86):
        return "snow_showers"
    if code == 95:
        return "thunderstorm"
    if code in (96, 99):
        return "thunderstorm_with_hail"
    return "overcast"


def calculate_accumulation(
    times: list[str], precip: list[float | None], reference_time: str
) -> tuple[float, float, float]:
    """Calculate 24h, 72h historical rainfall and 7d forecast accumulation.

    Uses exact timestamp alignment instead of fragile hardcoded indices.
    """
    clean_precip = [p if p is not None else 0.0 for p in precip]
    ref_norm = reference_time[:13] + ":00"

    idx = len(times) - 1
    for i, t in enumerate(times):
        if t.startswith(ref_norm):
            idx = i
            break

    rain_24h = sum(clean_precip[max(0, idx - 24):idx])
    rain_3d = sum(clean_precip[max(0, idx - 72):idx])
    rain_7d_fcst = sum(clean_precip[idx:idx + 168])

    return round(rain_24h, 1), round(rain_3d, 1), round(rain_7d_fcst, 1)


def _haversine_distance_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Compute spherical distance between two coordinates in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    return 2.0 * r * math.asin(math.sqrt(min(1.0, a)))


def parse_weather_grid(weather_grid: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Pre-parse and pre-index weather grid arrays once for zero-allocation route scoring."""
    parsed_grid = []
    for g in weather_grid:
        if g.get("_pre_parsed"):
            parsed_grid.append(g)
            continue
        times = g.get("hourly_time") or []
        if isinstance(times, str):
            try:
                times = json.loads(times)
            except Exception:
                times = []
        precip = g.get("hourly_precipitation") or []
        if isinstance(precip, str):
            try:
                precip = json.loads(precip)
            except Exception:
                precip = []
        vis = g.get("hourly_visibility") or []
        if isinstance(vis, str):
            try:
                vis = json.loads(vis)
            except Exception:
                vis = []
        codes = g.get("hourly_weather_code") or []
        if isinstance(codes, str):
            try:
                codes = json.loads(codes)
            except Exception:
                codes = []
        gusts = g.get("hourly_wind_gust") or []
        if isinstance(gusts, str):
            try:
                gusts = json.loads(gusts)
            except Exception:
                gusts = []

        parsed_timestamps = []
        for t_str in times:
            try:
                t_clean = t_str.replace("Z", "").split("+")[0]
                if len(t_clean) == 16:
                    dt = datetime.fromisoformat(t_clean).replace(tzinfo=timezone.utc)
                else:
                    dt = datetime.fromisoformat(t_clean[:19]).replace(tzinfo=timezone.utc)
                parsed_timestamps.append(dt.timestamp())
            except Exception:
                parsed_timestamps.append(0.0)

        parsed_grid.append({
            "_pre_parsed": True,
            "point_name": g.get("point_name", ""),
            "lon": float(g.get("lon", 0.0)),
            "lat": float(g.get("lat", 0.0)),
            "times": times,
            "timestamps": parsed_timestamps,
            "precip": precip,
            "visibility": vis,
            "codes": codes,
            "gusts": gusts,
            "rain_24h": float(g.get("rain_24h", 0.0)),
            "rain_3d": float(g.get("rain_3d", 0.0)),
            "current_rain_mm_h": float(g.get("current_rain_mm_h", 0.0)),
            "current_visibility_m": float(g.get("current_visibility_m", 10000.0)),
            "current_wind_gust_kmh": float(g.get("current_wind_gust_kmh", 0.0)),
        })
    return parsed_grid


def _calc_arrival_times(
    departure_time: Optional[datetime], t_min_h: float, t_max_h: float
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Compute concrete UTC arrival datetimes given a departure timestamp and offset bounds."""
    if departure_time is None:
        return None, None
    start_dt = departure_time + timedelta(seconds=round(t_min_h * 3600))
    end_dt = departure_time + timedelta(seconds=round(t_max_h * 3600))
    return start_dt, end_dt


def _track_rain_best(leg: dict, cur: tuple) -> tuple:
    """Update running best for rain window detection: (max_rate, condition, location)."""
    rate = leg.get("precipitation_mm_h", 0.0)
    if rate > cur[0]:
        loc = leg.get("crossing") or leg.get("gauge") or leg.get("nearest_weather_point") or f"Km {leg['km_from_start']:.1f}"
        return (rate, leg.get("weather_condition", "clear_sky"), loc)
    return cur


def _track_fog_best(leg: dict, cur: tuple) -> tuple:
    """Update running best for fog section detection: (min_visibility, location)."""
    v = leg.get("visibility_m", 10000.0)
    if v < cur[0]:
        loc = leg.get("crossing") or leg.get("gauge") or leg.get("nearest_weather_point") or f"Km {leg['km_from_start']:.1f}"
        return (v, loc)
    return cur


def _find_contiguous_intervals(legs, departure_time, is_active, track_best, initial_best, format_interval):
    """Generic contiguous interval detector for weather sections (rain, fog, etc.).

    Args:
        legs: List of leg dicts with km_from_start, t_min_hours/t_max_hours.
        departure_time: Optional departure datetime for arrival time calculation.
        is_active: Callable(leg) -> bool — whether this leg is "in" the condition.
        track_best: Callable(leg, current_best) -> new_best — update running best.
        initial_best: Initial value for the running best tracker.
        format_interval: Callable(km_start, km_end, t_min, t_max, start_dt, end_dt, best) -> dict.
    """
    intervals = []
    in_interval = False
    start_km = 0.0
    t_min = 0.0
    t_max = 0.0
    best = initial_best

    for leg in legs:
        km = leg["km_from_start"]
        leg_t_min = leg.get("t_min_hours", leg.get("elapsed_hours", 0.0))
        leg_t_max = leg.get("t_max_hours", leg.get("elapsed_hours", 0.0))

        if is_active(leg):
            if not in_interval:
                in_interval = True
                start_km = km
                t_min = leg_t_min
                t_max = leg_t_max
                best = track_best(leg, initial_best)
            else:
                t_max = max(t_max, leg_t_max)
                best = track_best(leg, best)
        else:
            if in_interval:
                in_interval = False
                start_dt, end_dt = _calc_arrival_times(departure_time, t_min, t_max)
                intervals.append(format_interval(start_km, km, t_min, t_max, start_dt, end_dt, best))

    if in_interval and legs:
        end_km = legs[-1]["km_from_start"]
        t_max = max(t_max, legs[-1].get("t_max_hours", legs[-1].get("elapsed_hours", 0.0)))
        start_dt, end_dt = _calc_arrival_times(departure_time, t_min, t_max)
        intervals.append(format_interval(start_km, end_km, t_min, t_max, start_dt, end_dt, best))

    return intervals


def evaluate_weather(
    legs: List[Dict[str, Any]],
    weather_grid: List[Dict[str, Any]],
    departure_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Evaluate spatiotemporal weather arrival profile across route legs.

    Matches each route leg with the nearest weather cell and slices the forecast
    for the vehicle arrival time interval [t_min_hours, t_max_hours].
    """
    if not legs or not weather_grid:
        return {
            "has_active_rain": False,
            "rain_distance_km": 0.0,
            "max_rain_rate_mm_h": 0.0,
            "min_visibility_m": 10000.0,
            "visibility_verdict": "CLEAR",
            "max_wind_gust_kmh": 0.0,
            "rain_windows": [],
            "fog_sections": [],
            "high_crosswind_sections": [],
        }

    dep_time = departure_time or datetime.now(timezone.utc)

    if weather_grid and weather_grid[0].get("_pre_parsed"):
        parsed_grid = weather_grid
    else:
        parsed_grid = parse_weather_grid(weather_grid)

    max_rain = 0.0
    min_vis = 10000.0
    max_gust = 0.0
    rain_km = 0.0

    # Match each leg with nearest cell
    for leg in legs:
        lon, lat = leg["lon"], leg["lat"]
        cos_lat = math.cos(math.radians(lat))
        best_cell = min(parsed_grid, key=lambda c: ((c["lon"] - lon) * cos_lat) ** 2 + (c["lat"] - lat) ** 2)

        # Calculate arrival time interval
        t_min_h = leg.get("t_min_hours", leg.get("elapsed_hours", 0.0))
        t_max_h = leg.get("t_max_hours", leg.get("elapsed_hours", 0.0))

        arr_min_dt = dep_time + timedelta(hours=t_min_h)
        arr_max_dt = dep_time + timedelta(hours=t_max_h)
        arr_min_ts = arr_min_dt.timestamp() - 3600.0
        arr_max_ts = arr_max_dt.timestamp() + 3600.0

        times = best_cell["times"]
        timestamps = best_cell["timestamps"]
        precip = best_cell["precip"]
        vis = best_cell["visibility"]
        codes = best_cell["codes"]
        gusts = best_cell["gusts"]

        if times and precip and timestamps:
            # Find indices overlapping [arr_min_ts, arr_max_ts]
            matched_indices = [
                i for i, ts in enumerate(timestamps)
                if arr_min_ts <= ts <= arr_max_ts
            ]

            if not matched_indices:
                matched_indices = [0]

            leg_rain = max((float(precip[i]) for i in matched_indices if i < len(precip) and precip[i] is not None), default=0.0)
            leg_vis = min((float(vis[i]) for i in matched_indices if i < len(vis) and vis[i] is not None), default=10000.0)
            leg_gust = max((float(gusts[i]) for i in matched_indices if i < len(gusts) and gusts[i] is not None), default=0.0)
            peak_idx = matched_indices[0]
            for i in matched_indices:
                if i < len(precip) and precip[i] is not None and float(precip[i]) == leg_rain:
                    peak_idx = i
                    break
            leg_wmo = int(codes[peak_idx]) if peak_idx < len(codes) and codes[peak_idx] is not None else 0
        else:
            leg_rain = best_cell["current_rain_mm_h"]
            leg_vis = best_cell["current_visibility_m"]
            leg_gust = best_cell["current_wind_gust_kmh"]
            leg_wmo = 0

        leg["precipitation_mm_h"] = round(leg_rain, 2)
        leg["rain_class"] = classify_rain_rate(leg_rain)
        leg["visibility_m"] = round(leg_vis, 1)
        leg["visibility_class"] = classify_visibility(leg_vis)
        leg["wind_gust_kmh"] = round(leg_gust, 1)
        leg["weather_condition"] = classify_weather_code(leg_wmo)
        leg["nearest_weather_point"] = best_cell["point_name"]
        leg["rain_24h"] = best_cell.get("rain_24h", 0.0)
        leg["rain_3d"] = best_cell.get("rain_3d", 0.0)


        if leg_rain > max_rain:
            max_rain = leg_rain
        if leg_vis < min_vis:
            min_vis = leg_vis
        if leg_gust > max_gust:
            max_gust = leg_gust

    # Calculate rain footprint distance
    # Approximating leg length as distance between consecutive legs
    for idx, leg in enumerate(legs):
        if leg.get("precipitation_mm_h", 0.0) >= 0.1:
            if idx > 0:
                step_km = leg["km_from_start"] - legs[idx - 1]["km_from_start"]
            elif len(legs) > 1:
                step_km = legs[1]["km_from_start"] - legs[0]["km_from_start"]
            else:
                step_km = 0.0
            rain_km += max(0.0, step_km)

    # Determine visibility verdict
    if min_vis < 150.0:
        vis_verdict = "RESTRICTED_FOG_HAZARD"
    elif min_vis < 500.0:
        vis_verdict = "CAUTION_FOG"
    elif min_vis < 1000.0:
        vis_verdict = "IMPAIRED_VISIBILITY"
    else:
        vis_verdict = "CLEAR"

    # Identify rain windows (contiguous intervals of rain)
    rain_windows = _find_contiguous_intervals(
        legs, departure_time,
        is_active=lambda leg: leg.get("precipitation_mm_h", 0.0) >= 0.1,
        track_best=lambda leg, cur: _track_rain_best(leg, cur),
        initial_best=(0.0, "dry", ""),
        format_interval=lambda km_start, km_end, t_min, t_max, start_dt, end_dt, best: {
            "km_start": round(km_start, 1),
            "km_end": round(km_end, 1),
            "length_km": round(max(0.0, km_end - km_start), 1),
            "arrival_start_hours": round(t_min, 2),
            "arrival_end_hours": round(t_max, 2),
            "arrival_start_time": start_dt.isoformat() if start_dt else None,
            "arrival_end_time": end_dt.isoformat() if end_dt else None,
            "arrival_window": f"T+{t_min:.1f}h to T+{t_max:.1f}h",
            "max_rain_rate_mm_h": round(best[0], 2),
            "rain_class": classify_rain_rate(best[0]),
            "condition": best[1],
            "location": best[2],
        },
    )

    # Fog sections (visibility < 500m)
    fog_sections = _find_contiguous_intervals(
        legs, departure_time,
        is_active=lambda leg: leg.get("visibility_m", 10000.0) < 500.0,
        track_best=lambda leg, cur: _track_fog_best(leg, cur),
        initial_best=(10000.0, ""),
        format_interval=lambda km_start, km_end, t_min, t_max, start_dt, end_dt, best: {
            "km_start": round(km_start, 1),
            "km_end": round(km_end, 1),
            "length_km": round(max(0.0, km_end - km_start), 1),
            "arrival_start_hours": round(t_min, 2),
            "arrival_end_hours": round(t_max, 2),
            "arrival_start_time": start_dt.isoformat() if start_dt else None,
            "arrival_end_time": end_dt.isoformat() if end_dt else None,
            "arrival_window": f"T+{t_min:.1f}h to T+{t_max:.1f}h",
            "min_visibility_m": round(best[0], 1),
            "visibility_class": classify_visibility(best[0]),
            "location": best[1],
        },
    )

    # High crosswind sections (gusts >= 55 km/h)
    high_crosswind_sections = []
    for leg in legs:
        gust = leg.get("wind_gust_kmh", 0.0)
        if gust >= 55.0:
            c_t_min = leg.get("t_min_hours", leg.get("elapsed_hours", 0.0))
            c_t_max = leg.get("t_max_hours", leg.get("elapsed_hours", 0.0))
            c_start_dt, c_end_dt = _calc_arrival_times(departure_time, c_t_min, c_t_max)
            high_crosswind_sections.append({
                "km": round(leg["km_from_start"], 1),
                "arrival_start_hours": round(c_t_min, 2),
                "arrival_end_hours": round(c_t_max, 2),
                "arrival_start_time": c_start_dt.isoformat() if c_start_dt else None,
                "arrival_end_time": c_end_dt.isoformat() if c_end_dt else None,
                "arrival_window": f"T+{c_t_min:.1f}h to T+{c_t_max:.1f}h",
                "wind_gust_kmh": round(gust, 1),
                "location": leg.get("crossing") or leg.get("gauge") or f"Km {leg['km_from_start']:.1f}",
                "warning": "Crosswind rollover advisory for empty tankers and high-profile vehicles"
                if gust >= 75.0 else "Caution: crosswind drag on exposed viaduct",
            })

    return {
        "has_active_rain": max_rain >= 0.1,
        "rain_distance_km": round(rain_km, 1),
        "max_rain_rate_mm_h": round(max_rain, 2),
        "min_visibility_m": round(min_vis, 1),
        "visibility_verdict": vis_verdict,
        "max_wind_gust_kmh": round(max_gust, 1),
        "rain_windows": rain_windows,
        "fog_sections": fog_sections,
        "high_crosswind_sections": high_crosswind_sections,
    }
