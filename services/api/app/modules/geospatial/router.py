"""Public bounded nearby-search endpoint."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session
from app.modules.catalog.errors import CatalogNotFoundError
from app.modules.catalog.schemas import PlaceCategory
from app.modules.geospatial.schemas import NearbyPlacesResponse
from app.modules.geospatial.service import (
    MAX_NEARBY_RESULTS,
    MAX_SEARCH_RADIUS_METERS,
    GeospatialService,
)

router = APIRouter(tags=["geospatial"])


@router.get("/places/nearby", response_model=NearbyPlacesResponse)
async def nearby_places(
    session: Annotated[AsyncSession, Depends(get_session)],
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
    radius_meters: Annotated[float, Query(gt=0, le=MAX_SEARCH_RADIUS_METERS)] = 3000,
    limit: Annotated[int, Query(ge=1, le=MAX_NEARBY_RESULTS)] = 20,
    destination_id: UUID | None = None,
    category: PlaceCategory | None = None,
) -> NearbyPlacesResponse:
    try:
        return await GeospatialService(session).search_nearby(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            limit=limit,
            destination_id=destination_id,
            category=category,
        )
    except CatalogNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
