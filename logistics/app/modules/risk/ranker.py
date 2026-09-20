"""Candidate route ranking and dispatch recommendation."""

from __future__ import annotations

from typing import List, Dict, Any
from app.enums import VERDICT_RANK


def rank_candidate_routes(scored_routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort candidate routes by verdict priority, worst P(RP5), and load ratio."""
    return sorted(
        scored_routes,
        key=lambda s: (
            VERDICT_RANK.get(s["verdict"], 2),
            s["worst"]["p_rp5"],
            s.get("duration_min", 0),
        ),
    )


def format_ranked_response(extra: Dict[str, Any], scored_routes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format final response dictionary with ranked routes and primary recommendation."""
    ranked = rank_candidate_routes(scored_routes)
    recommendation = ranked[0]["route_id"] if ranked else ""
    ranking_ids = [s["route_id"] for s in ranked]
    return {
        **extra,
        "recommendation": recommendation,
        "ranking": ranking_ids,
        "routes": scored_routes,
    }
