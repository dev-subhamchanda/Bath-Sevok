"""TomTom API client for truck-profile routing with live traffic."""

from __future__ import annotations

from typing import List, Dict, Any
import httpx
from app.settings import settings


async def fetch_tomtom_routes(
    start: list[float],
    end: list[float],
    key: str | None = None,
    alternates: int = 2,
) -> List[Dict[str, Any]]:
    """Query TomTom for truck routes with live traffic delays."""
    api_key = key or settings.routing.tomtom_api_key
    if not api_key:
        raise ValueError("Missing TomTom key. Configure TOMTOM_KEY or supply in request.")

    loc = f"{start[1]},{start[0]}:{end[1]},{end[0]}"
    params: Dict[str, Any] = {
        "key": api_key,
        "traffic": "true",
        "travelMode": "truck",
        "vehicleMaxSpeed": 80,
        "vehicleWeight": 12000,
    }
    if alternates > 0:
        params["maxAlternatives"] = min(alternates, 2)

    url = f"{settings.routing.tomtom_api_url}/{loc}/json"

    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            raise RuntimeError(f"TomTom error {r.status_code}: {r.text[:200]}")
        data = r.json()

    routes_data = data.get("routes", [])
    if not routes_data:
        raise RuntimeError("TomTom returned no routes.")

    results = []
    for i, route in enumerate(routes_data):
        summary = route.get("summary", {})
        points = [
            [p["longitude"], p["latitude"]]
            for leg in route.get("legs", [])
            for p in leg.get("points", [])
        ]
        results.append({
            "route_id": f"tomtom-{i}",
            "points": points,
            "distance_km": round(summary.get("lengthInMeters", 0) / 1000.0, 1),
            "duration_min": round(summary.get("travelTimeInSeconds", 0) / 60.0, 1),
            "traffic_delay_min": round(summary.get("trafficDelayInSeconds", 0) / 60.0, 1),
        })

    return results
