"""NASA LHASA ImageServer REST API client.

LHASA v2.1 outputs a continuous probability float P(landslide) in [0, 1]
per 1 km cell from an XGBoost model trained on GPM IMERG rainfall, SMAP
soil moisture, slope, lithology, fault proximity, and road density.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import httpx

import json as _json

logger = logging.getLogger(__name__)

_BASE_URL = "https://gis.earthdata.nasa.gov/portal/rest/services/Landslides"

LAYER_URLS: Dict[str, str] = {
    "hazard_today": f"{_BASE_URL}/LHASA_Hazard_Today/ImageServer",
    "hazard_tomorrow": f"{_BASE_URL}/LHASA_Hazard_Tomorrow/ImageServer",
    "hazard_yesterday": f"{_BASE_URL}/LHASA_Hazard_Yesterday/ImageServer",
    "susceptibility": f"{_BASE_URL}/Global_Landslide_Susceptibility/ImageServer",
}

NE_BBOX = (88.0, 21.5, 97.5, 29.8)


def _build_getsamples_body(coords: List[Tuple[float, float]]) -> dict:
    """Build form-encoded body for ArcGIS ImageServer getSamples POST.

    Coordinates are (lon, lat) tuples in WGS84.
    The NASA ArcGIS REST API requires form-encoded POST with explicit geometryType.
    """
    geometry = {
        "points": [[lon, lat] for lon, lat in coords],
        "spatialReference": {"wkid": 4326},
    }
    return {
        "geometry": _json.dumps(geometry),
        "geometryType": "esriGeometryMultipoint",
        "returnFirstValueOnly": "true",
        "f": "json",
    }


def _parse_getsamples_response(
    resp_json: dict,
    n_expected: int,
) -> List[Optional[float]]:
    """Extract probability values from getSamples JSON response.

    Returns a list of length n_expected. Missing/null values become None.
    Raw values are returned as-is from the API (hazard: 0-1, susceptibility: 0-5).
    Callers should normalize susceptibility values to 0-1 if needed.
    """
    samples = resp_json.get("samples", [])
    values: List[Optional[float]] = []

    for sample in samples:
        raw = sample.get("value")
        if raw is None or raw == "NoData" or raw == "":
            values.append(None)
        else:
            try:
                v = float(raw)
                values.append(v)
            except (ValueError, TypeError):
                values.append(None)

    while len(values) < n_expected:
        values.append(None)

    return values[:n_expected]


async def get_lhasa_samples(
    coords: List[Tuple[float, float]],
    layer_key: str = "hazard_today",
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Optional[float]]:
    """Query LHASA probability values at specific coordinates.

    Args:
        coords: List of (lon, lat) tuples in WGS84.
        layer_key: One of 'hazard_today', 'hazard_tomorrow',
                   'hazard_yesterday', 'susceptibility'.
        timeout: HTTP timeout in seconds.
        client: Optional shared httpx client. Creates one if None.

    Returns:
        List of floats in [0, 1] or None per coordinate.
        None indicates missing data (cloud mask, ocean, or server error).
    """
    if not coords:
        return []

    url = LAYER_URLS.get(layer_key)
    if not url:
        logger.error("Unknown LHASA layer key: %s", layer_key)
        return [None] * len(coords)

    body = _build_getsamples_body(coords)
    get_samples_url = f"{url}/getSamples"

    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(timeout=timeout)

    try:
        resp = await client.post(get_samples_url, data=body)
        resp.raise_for_status()
        resp_json = resp.json()
        return _parse_getsamples_response(resp_json, len(coords))
    except httpx.TimeoutException:
        logger.warning("LHASA getSamples timeout for layer %s (%d points)", layer_key, len(coords))
        return [None] * len(coords)
    except httpx.HTTPStatusError as e:
        logger.warning("LHASA getSamples HTTP %d for layer %s", e.response.status_code, layer_key)
        return [None] * len(coords)
    except Exception as e:
        logger.warning("LHASA getSamples error: %s", e)
        return [None] * len(coords)
    finally:
        if owns_client:
            await client.aclose()


async def get_lhasa_hazard_samples(
    coords: List[Tuple[float, float]],
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Optional[float]]:
    """Query LHASA active hazard probability at coordinates (today's nowcast)."""
    return await get_lhasa_samples(coords, layer_key="hazard_today", timeout=timeout, client=client)


async def get_lhasa_susceptibility_samples(
    coords: List[Tuple[float, float]],
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Optional[float]]:
    """Query static landslide susceptibility at coordinates."""
    return await get_lhasa_samples(coords, layer_key="susceptibility", timeout=timeout, client=client)


async def get_lhasa_multi_layer(
    coords: List[Tuple[float, float]],
    timeout: float = 10.0,
) -> Dict[str, List[Optional[float]]]:
    """Query both hazard (today) and susceptibility in parallel.

    Returns dict with keys 'hazard' and 'susceptibility', each a list of
    Optional[float] aligned to the input coords.
    """
    import asyncio

    async with httpx.AsyncClient(timeout=timeout) as client:
        hazard_task = get_lhasa_hazard_samples(coords, timeout=timeout, client=client)
        susc_task = get_lhasa_susceptibility_samples(coords, timeout=timeout, client=client)
        hazard_vals, susc_vals = await asyncio.gather(hazard_task, susc_task)

    return {
        "hazard": hazard_vals,
        "susceptibility": susc_vals,
    }
