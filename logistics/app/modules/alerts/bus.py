"""In-memory event bus for broadcasting alert updates to active SSE connections."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Set


class AlertBus:
    """Pub/sub bus for dispatching live alert notifications across active SSE clients."""

    def __init__(self) -> None:
        self._subscribers: Set[asyncio.Queue[Dict[str, Any]]] = set()

    def subscribe(self) -> asyncio.Queue[Dict[str, Any]]:
        """Register a new SSE client subscriber queue."""
        q: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[Dict[str, Any]]) -> None:
        """Remove a subscriber queue when client disconnects."""
        self._subscribers.discard(q)

    def publish(self, event: Dict[str, Any]) -> int:
        """Broadcast an alert event payload to all active subscriber queues."""
        delivered = 0
        for q in list(self._subscribers):
            try:
                q.put_nowait(event)
                delivered += 1
            except asyncio.QueueFull:
                # Discard event for backpressured or stuck clients
                pass
        return delivered

    @property
    def subscriber_count(self) -> int:
        """Return the number of currently active connected clients."""
        return len(self._subscribers)


alert_bus = AlertBus()
