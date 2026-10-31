"""Dependency-aware readiness endpoint."""

import logging
from collections.abc import Awaitable, Callable
from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel

from app.infrastructure.cache import check_redis
from app.infrastructure.database import check_database

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system"])
ReadinessCheck = Callable[[], Awaitable[None]]


class DependencyStatus(BaseModel):
    status: Literal["ok", "unavailable"]


class ReadinessResponse(BaseModel):
    status: Literal["ready", "not_ready"]
    checks: dict[str, DependencyStatus]


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    responses={503: {"model": ReadinessResponse}},
)
async def readiness(response: Response) -> ReadinessResponse:
    """Check PostgreSQL and Redis; return 503 until both dependencies are usable."""

    checks: dict[str, DependencyStatus] = {}
    readiness_checks: tuple[tuple[str, ReadinessCheck], ...] = (
        ("database", check_database),
        ("redis", check_redis),
    )
    for name, check in readiness_checks:
        try:
            await check()
            checks[name] = DependencyStatus(status="ok")
        except Exception:
            logger.warning("Readiness dependency unavailable", extra={"dependency": name})
            checks[name] = DependencyStatus(status="unavailable")

    is_ready = all(item.status == "ok" for item in checks.values())
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(status="ready" if is_ready else "not_ready", checks=checks)
