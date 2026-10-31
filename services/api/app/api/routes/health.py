"""Liveness endpoint."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "adora-api"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Report process liveness without requiring downstream services."""

    return HealthResponse()
