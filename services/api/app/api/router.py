"""Versioned API router composition."""

from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.readiness import router as readiness_router
from app.modules.identity.router import router as identity_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(readiness_router)
api_router.include_router(identity_router)
