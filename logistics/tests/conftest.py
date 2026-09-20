"""Pytest and Hypothesis test suite configuration.

Configures Hypothesis test profile to avoid flaky deadline warnings on Windows disk I/O.
"""

from __future__ import annotations

from hypothesis import settings, HealthCheck

# Register a default profile with extended deadline for database-backed property tests
settings.register_profile(
    "default",
    deadline=5000,
    suppress_health_check=[HealthCheck.too_slow],
)
settings.load_profile("default")
