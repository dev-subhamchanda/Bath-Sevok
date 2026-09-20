"""Webhook dispatcher with retry logic for partner backend integration."""

from __future__ import annotations

import asyncio
from typing import Dict, Any, List
import httpx
from app.settings import settings


async def post_webhook_payload(client: httpx.AsyncClient, url: str, payload: Dict[str, Any]) -> bool:
    """Post JSON payload to a single webhook endpoint with retries."""
    for attempt in range(settings.alerts.webhook_retries):
        try:
            r = await client.post(url, json=payload, timeout=settings.alerts.webhook_timeout)
            if r.status_code < 300:
                return True
        except Exception:
            pass
        await asyncio.sleep(1.0)
    return False


async def broadcast_alerts(alerts: List[Dict[str, Any]], webhooks: List[str] | None = None) -> int:
    """Broadcast firing alerts to all registered webhook endpoints."""
    target_urls = webhooks or settings.alerts.webhooks
    if not target_urls or not alerts:
        return 0

    successful_posts = 0
    async with httpx.AsyncClient() as client:
        tasks = []
        for alert in alerts:
            for url in target_urls:
                tasks.append(post_webhook_payload(client, url, alert))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        successful_posts = sum(1 for r in results if r is True)

    return successful_posts
