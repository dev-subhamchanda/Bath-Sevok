"""FastAPI application factory, middleware, and lifespan lifecycle management."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.settings import settings
from app.api.endpoints import (
    health,
    corridors,
    routing,
    alerts,
    features,
    segments,
    weather,
    hazards,
)
from app.worker.scheduler import background_worker_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown background worker tasks."""
    worker_task = None
    if settings.server.enable_worker:
        worker_task = asyncio.create_task(background_worker_loop())
    try:
        yield
    finally:
        if worker_task:
            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass


def create_app() -> FastAPI:
    """Instantiate and configure the FastAPI application."""
    app = FastAPI(
        title="NE India Flood Logistics API",
        version="1.0.0",
        description="Corridor and dynamic route flood risk from calibrated GloFAS discharge.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.server.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # Register endpoint routers
    app.include_router(health.router)
    app.include_router(corridors.router)
    app.include_router(routing.router)
    app.include_router(alerts.router)
    app.include_router(features.router)
    app.include_router(segments.router)
    app.include_router(weather.router)
    app.include_router(hazards.router)

    return app


app = create_app()
