"""NDMA SACHET Common Alerting Protocol (CAP) RSS feed client and parser.

Fetches real-time disaster alerts, roadblocks, and warnings for Northeast India,
normalizing coordinates into standard OGC Well-Known Text (WKT) geometries.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx

SACHET_RSS_URL = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml"
CAP_NS = {"cap": "urn:oasis:names:tc:emergency:cap:1.2"}

# Bounding box for Northeast India
NE_LON_MIN, NE_LON_MAX = 88.0, 97.5
NE_LAT_MIN, NE_LAT_MAX = 21.5, 29.8

NE_KNOWN_LOCATIONS: Dict[str, Tuple[float, float]] = {
    "dibrugarh": (94.875, 27.525),
    "numaligarh": (94.225, 26.925),
    "golaghat": (93.97, 26.52),
    "beki": (90.95, 26.48),
    "barpeta": (91.00, 26.32),
    "guwahati": (91.675, 26.175),
    "kamrup": (91.50, 26.25),
    "tezpur": (92.725, 26.625),
    "sonitpur": (92.80, 26.70),
    "kaziranga": (93.17, 26.58),
    "jorhat": (94.22, 26.75),
    "silchar": (92.825, 24.825),
    "cachar": (92.80, 24.80),
    "haflong": (93.03, 25.18),
    "dima hasao": (93.10, 25.20),
    "bongaigaon": (90.625, 26.175),
    "dhubri": (89.98, 26.02),
    "goalpara": (90.62, 26.17),
    "morigaon": (92.34, 26.26),
    "nagaon": (92.68, 26.35),
    "lakhimpur": (94.125, 27.225),
    "dhemaji": (94.58, 27.48),
    "tinsukia": (95.36, 27.50),
    "sibsagar": (94.63, 26.98),
    "shillong": (91.88, 25.57),
    "east khasi hills": (91.90, 25.55),
    "jowai": (92.19, 25.45),
    "west jaintia hills": (92.20, 25.45),
    "east jaintia hills": (92.40, 25.35),
    "lumshnong": (92.38, 25.18),
    "sonapur": (92.36, 25.08),
    "tura": (90.22, 25.52),
    "west garo hills": (90.20, 25.50),
    "cherrapunji": (91.73, 25.27),
    "sohra": (91.73, 25.27),
    "dimapur": (93.725, 25.925),
    "kohima": (94.11, 25.67),
    "chumukedima": (93.77, 25.80),
    "imphal": (93.94, 24.82),
    "noney": (93.60, 25.12),
    "tamenglong": (93.49, 24.98),
    "moreh": (94.32, 24.22),
    "tengnoupal": (94.15, 24.38),
    "aizawl": (92.72, 23.73),
    "kolasib": (92.68, 24.23),
    "serchhip": (92.85, 23.34),
    "lunglei": (92.73, 22.88),
    "agartala": (91.28, 23.83),
    "dharmanagar": (91.77, 24.67),
    "gangtok": (88.525, 27.175),
    "rangpo": (88.525, 27.175),
    "jorethang": (88.325, 27.075),
    "singtam": (88.50, 27.23),
    "mangan": (88.53, 27.50),
    "pasighat": (95.325, 28.075),
    "east siang": (95.30, 28.10),
    "itanagar": (93.60, 27.10),
    "papum pare": (93.60, 27.10),
    "tawang": (91.86, 27.58),
    "bomdila": (92.42, 27.26),
    "roing": (95.83, 28.14),
    "tezu": (96.17, 27.92),
}

NE_STATE_KEYWORDS = [
    "assam",
    "meghalaya",
    "arunachal",
    "nagaland",
    "manipur",
    "mizoram",
    "tripura",
    "sikkim",
]


def parse_cap_polygon_to_wkt(raw_coords: str) -> Optional[str]:
    """Convert CAP polygon coordinate string (lat,lon pairs) to standard OGC WKT polygon.

    CAP standard specifies: 'lat,lon lat,lon lat,lon ...'
    OGC WKT standard requires: 'POLYGON((lon lat, lon lat, ...))'
    Ensures closing ring coordinate and validates bounds.
    """
    if not raw_coords:
        return None

    pairs = raw_coords.strip().split()
    if len(pairs) < 3:
        return None

    lon_lat_list: List[Tuple[float, float]] = []
    for pair in pairs:
        parts = pair.split(",")
        if len(parts) != 2:
            continue
        try:
            lat = float(parts[0].strip())
            lon = float(parts[1].strip())
            lon_lat_list.append((lon, lat))
        except ValueError:
            continue

    if len(lon_lat_list) < 3:
        return None

    # Ensure closed ring (first vertex equals last vertex)
    if lon_lat_list[0] != lon_lat_list[-1]:
        lon_lat_list.append(lon_lat_list[0])

    # Check if at least one coordinate intersects NE bounding box
    in_bounds = any(
        NE_LON_MIN <= lon <= NE_LON_MAX and NE_LAT_MIN <= lat <= NE_LAT_MAX
        for lon, lat in lon_lat_list
    )
    if not in_bounds:
        return None

    coords_str = ", ".join(f"{round(lon, 6)} {round(lat, 6)}" for lon, lat in lon_lat_list)
    return f"POLYGON(({coords_str}))"


def make_buffer_polygon_wkt(lon: float, lat: float, delta_deg: float = 0.15) -> str:
    """Create a rectangular polygon bounding buffer around a center coordinate."""
    min_lon, max_lon = round(lon - delta_deg, 6), round(lon + delta_deg, 6)
    min_lat, max_lat = round(lat - delta_deg, 6), round(lat + delta_deg, 6)
    return (
        f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, "
        f"{max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
    )


def match_location_polygon(text: str) -> Optional[str]:
    """Look up district or town mention in alert text and build a representative hazard polygon."""
    text_lower = text.lower()
    for loc_name, (lon, lat) in NE_KNOWN_LOCATIONS.items():
        # Match whole word or token
        pattern = r"\b" + re.escape(loc_name) + r"\b"
        if re.search(pattern, text_lower):
            return make_buffer_polygon_wkt(lon, lat, delta_deg=0.15)
    return None


def _find_elem(parent: ET.Element, cap_name: str) -> Optional[ET.Element]:
    """Find child element by CAP namespace or tag suffix without triggering boolean truth checks."""
    el = parent.find(f"cap:{cap_name}", CAP_NS)
    if el is not None:
        return el
    return next((e for e in parent if e.tag.endswith(cap_name)), None)


def parse_cap_xml(xml_content: bytes | str) -> List[Dict[str, Any]]:
    """Parse raw CAP XML string/bytes into structured alert records with WKT geometries."""
    try:
        root = ET.fromstring(xml_content)
    except Exception:
        return []

    alerts: List[Dict[str, Any]] = []

    identifier = ""
    id_elem = _find_elem(root, "identifier")
    if id_elem is not None and id_elem.text:
        identifier = id_elem.text.strip()

    if not identifier:
        return []

    sender = ""
    sender_elem = _find_elem(root, "sender")
    if sender_elem is not None and sender_elem.text:
        sender = sender_elem.text.strip()

    sent_at_str = ""
    sent_elem = _find_elem(root, "sent")
    if sent_elem is not None and sent_elem.text:
        sent_at_str = sent_elem.text.strip()

    info_elements = root.findall("cap:info", CAP_NS)
    if not info_elements:
        info_elements = [e for e in root.iter() if e.tag.endswith("info")]

    for idx, info in enumerate(info_elements):
        event_elem = _find_elem(info, "event")
        event = event_elem.text.strip() if event_elem is not None and event_elem.text else "Disaster Alert"

        severity_elem = _find_elem(info, "severity")
        severity = severity_elem.text.strip() if severity_elem is not None and severity_elem.text else "Moderate"

        urgency_elem = _find_elem(info, "urgency")
        urgency = urgency_elem.text.strip() if urgency_elem is not None and urgency_elem.text else "Expected"

        certainty_elem = _find_elem(info, "certainty")
        certainty = certainty_elem.text.strip() if certainty_elem is not None and certainty_elem.text else "Likely"

        headline_elem = _find_elem(info, "headline")
        headline = headline_elem.text.strip() if headline_elem is not None and headline_elem.text else ""

        desc_elem = _find_elem(info, "description")
        desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""

        instruction_elem = _find_elem(info, "instruction")
        instruction = instruction_elem.text.strip() if instruction_elem is not None and instruction_elem.text else ""

        effective_elem = _find_elem(info, "effective")
        effective_str = effective_elem.text.strip() if effective_elem is not None and effective_elem.text else sent_at_str

        expires_elem = _find_elem(info, "expires")
        expires_str = expires_elem.text.strip() if expires_elem is not None and expires_elem.text else ""

        # Parse timestamps safely
        sent_at = parse_iso_or_fallback(sent_at_str, fallback_offset_hours=0)
        effective_at = parse_iso_or_fallback(effective_str, fallback_offset_hours=0)
        expires_at = parse_iso_or_fallback(expires_str, fallback_offset_hours=12)

        area_elements = info.findall("cap:area", CAP_NS) or [e for e in info if e.tag.endswith("area")]
        for a_idx, area in enumerate(area_elements):
            area_desc_elem = _find_elem(area, "areaDesc")
            area_desc = area_desc_elem.text.strip() if area_desc_elem is not None and area_desc_elem.text else ""

            # Check for polygon
            poly_elem = _find_elem(area, "polygon")
            polygon_wkt = None
            if poly_elem is not None and poly_elem.text:
                polygon_wkt = parse_cap_polygon_to_wkt(poly_elem.text)

            # Check for circle
            if not polygon_wkt:
                circle_elem = _find_elem(area, "circle")
                if circle_elem is not None and circle_elem.text:
                    c_parts = circle_elem.text.strip().split(",")
                    if len(c_parts) >= 2:
                        try:
                            c_lat = float(c_parts[0])
                            c_lon = float(c_parts[1])
                            c_rad_km = float(c_parts[2]) if len(c_parts) > 2 else 10.0
                            delta = max(0.05, c_rad_km / 105.0)
                            if NE_LON_MIN <= c_lon <= NE_LON_MAX and NE_LAT_MIN <= c_lat <= NE_LAT_MAX:
                                polygon_wkt = make_buffer_polygon_wkt(c_lon, c_lat, delta_deg=delta)
                        except ValueError:
                            pass

            # Fallback: text location match on areaDesc and headline
            if not polygon_wkt:
                combined_text = f"{area_desc} {headline} {desc} {sender}"
                polygon_wkt = match_location_polygon(combined_text)

            # If no geometry could be grounded in NE India, skip alert
            if not polygon_wkt:
                continue

            unique_id = f"{identifier}_{idx}_{a_idx}"
            alerts.append({
                "identifier": unique_id,
                "sender": sender or "NDMA",
                "sent_at": sent_at,
                "effective_at": effective_at,
                "expires_at": expires_at,
                "event": event,
                "severity": severity,
                "urgency": urgency,
                "certainty": certainty,
                "headline": headline or event,
                "instruction": instruction,
                "area_desc": area_desc or "Northeast India Alert Zone",
                "polygon_wkt": polygon_wkt,
            })

    return alerts


def parse_iso_or_fallback(iso_str: str, fallback_offset_hours: int = 12) -> datetime:
    """Parse ISO8601 string or return current UTC time + offset hours."""
    if iso_str:
        try:
            # Handle ISO string with timezone offset e.g. 2026-09-19T12:08:08+05:30
            dt = datetime.fromisoformat(iso_str)
            return dt.astimezone(timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc) + timedelta(hours=fallback_offset_hours)


async def fetch_sachet_rss_alerts(client: Optional[httpx.AsyncClient] = None) -> List[Dict[str, Any]]:
    """Fetch SACHET RSS feed and parse all active alerts matching Northeast India.

    Returns a list of parsed alert dictionaries ready for database upsert.
    """
    owns_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=20.0, verify=False)
        owns_client = True

    alerts: List[Dict[str, Any]] = []
    try:
        r = await client.get(SACHET_RSS_URL)
        if r.status_code != 200:
            return []

        root = ET.fromstring(r.content)
        items = root.findall(".//item")

        # Filter candidate items for Northeast India
        candidate_links = []
        for it in items:
            title = it.find("title").text if it.find("title") is not None else ""
            desc = it.find("description").text if it.find("description") is not None else ""
            author = it.find("author").text if it.find("author") is not None else ""
            link_elem = it.find("link")
            link = link_elem.text.strip() if link_elem is not None and link_elem.text else ""

            if not link:
                continue

            text_all = f"{title} {desc} {author}".lower()
            # Prioritize items matching NE states or known towns
            if any(s in text_all for s in NE_STATE_KEYWORDS) or any(k in text_all for k in NE_KNOWN_LOCATIONS):
                candidate_links.append((link, True))
            else:
                candidate_links.append((link, False))

        # Fetch candidate alert detail XMLs (prioritize explicit NE hits first)
        ne_hits = [c[0] for c in candidate_links if c[1]]
        others = [c[0] for c in candidate_links if not c[1]][:15]  # probe first 15 general items
        fetch_targets = ne_hits + others

        for link in fetch_targets:
            try:
                det_r = await client.get(link)
                if det_r.status_code == 200:
                    parsed = parse_cap_xml(det_r.content)
                    alerts.extend(parsed)
            except Exception:
                continue

    except Exception:
        pass
    finally:
        if owns_client:
            await client.aclose()

    return alerts
