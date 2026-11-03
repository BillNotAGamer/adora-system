"""Versioned API router composition."""

from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.readiness import router as readiness_router
from app.modules.catalog.router import router as catalog_router
from app.modules.geospatial.router import router as geospatial_router
from app.modules.identity.router import router as identity_router
from app.modules.partner.router import router as partner_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(readiness_router)
api_router.include_router(identity_router)
# Register the static nearby route before the parameterized /places/{place_id} route.
api_router.include_router(geospatial_router)
api_router.include_router(catalog_router)
api_router.include_router(partner_router)
