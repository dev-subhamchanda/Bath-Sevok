"""Spatial mathematics, Haversine distance, coordinate deduplication, and sampling."""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Any, Optional


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate the great-circle distance between two GPS points in kilometers."""
    # Zero-distance guardrail for identical coordinates
    if abs(lon1 - lon2) < 1e-7 and abs(lat1 - lat2) < 1e-7:
        return 0.0

    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius_km * c


def deduplicate_coordinates(points: List[List[float]]) -> List[List[float]]:
    """Filter consecutive duplicate coordinates to prevent zero-distance division artifacts."""
    if not points:
        return []
    deduped = [points[0]]
    for pt in points[1:]:
        prev = deduped[-1]
        if abs(pt[0] - prev[0]) > 1e-6 or abs(pt[1] - prev[1]) > 1e-6:
            deduped.append(pt)
    return deduped


def sample_coordinates(
    points: List[List[float]], max_samples: int = 40
) -> List[Tuple[float, float]]:
    """Deduplicate and sample coordinates along a polyline."""
    clean_points = deduplicate_coordinates(points)
    if not clean_points:
        return []
    step = max(1, len(clean_points) // max_samples)
    sampled = [(pt[0], pt[1]) for pt in clean_points[::step]]
    # Ensure terminal coordinate is included
    if clean_points and (clean_points[-1][0], clean_points[-1][1]) != sampled[-1]:
        sampled.append((clean_points[-1][0], clean_points[-1][1]))
    return sampled


def sample_coordinates_adaptive(
    points: List[List[float]],
    max_samples: int = 40,
    structures: Optional[List[Dict[str, Any]]] = None,
    snap_radius_km: float = 2.5,
) -> List[Tuple[float, float]]:
    """Deduplicate and adaptively sample coordinates along a polyline, locking structure anchors.

    Ensures that registered structures (bridges, culverts) within `snap_radius_km`
    of the route polyline are preserved as mandatory sample anchors, eliminating decimation
    blind spots during downsampling. Intermediate segments between anchors are uniformly sampled.
    """
    clean_points = deduplicate_coordinates(points)
    n = len(clean_points)
    if n == 0:
        return []
    if n <= max_samples:
        return [(pt[0], pt[1]) for pt in clean_points]

    # Start and end points are always mandatory anchors
    anchors = {0, n - 1}

    # Lock nearby registered structures as anchors
    if structures:
        for s in structures:
            slon = s.get("lon")
            slat = s.get("lat")
            if slon is None or slat is None:
                continue
            try:
                slon_f, slat_f = float(slon), float(slat)
            except (ValueError, TypeError):
                continue

            best_idx = -1
            min_dist = float("inf")
            for idx, pt in enumerate(clean_points):
                d = haversine_km(pt[0], pt[1], slon_f, slat_f)
                if d < min_dist:
                    min_dist = d
                    best_idx = idx

            if min_dist <= snap_radius_km and best_idx != -1:
                anchors.add(best_idx)

    sorted_anchors = sorted(anchors)
    nominal_step = max(1, (n - 1) // max_samples)

    selected_indices: List[int] = []
    for start_idx, end_idx in zip(sorted_anchors[:-1], sorted_anchors[1:]):
        selected_indices.append(start_idx)
        span = end_idx - start_idx
        if span > 1:
            num_substeps = max(1, round(span / nominal_step))
            for step_i in range(1, num_substeps):
                inter_idx = start_idx + round(step_i * span / num_substeps)
                if inter_idx < end_idx and (not selected_indices or inter_idx > selected_indices[-1]):
                    selected_indices.append(inter_idx)

    if not selected_indices or sorted_anchors[-1] > selected_indices[-1]:
        selected_indices.append(sorted_anchors[-1])

    return [(clean_points[i][0], clean_points[i][1]) for i in selected_indices]

