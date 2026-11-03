"""Geospatial catalog search policy and response mapping."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.errors import CatalogNotFoundError
from app.modules.catalog.repository import CatalogRepository, PlaceView
from app.modules.catalog.service import place_response
from app.modules.geospatial.repository import GeospatialRepository
from app.modules.geospatial.schemas import NearbyPlaceResponse, NearbyPlacesResponse

MAX_SEARCH_RADIUS_METERS = 50_000.0
MAX_NEARBY_RESULTS = 100


class GeospatialService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search_nearby(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: float,
        limit: int,
        destination_id: UUID | None,
        category: str | None,
    ) -> NearbyPlacesResponse:
        if destination_id is not None and await CatalogRepository(self.session).get_destination(
            destination_id, public_only=True
        ) is None:
            raise CatalogNotFoundError("Active destination not found")
        views = await GeospatialRepository(self.session).nearby_places(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            limit=limit,
            destination_id=destination_id,
            category=category,
        )
        items: list[NearbyPlaceResponse] = []
        for view in views:
            place = place_response(
                PlaceView(
                    place=view.place,
                    longitude=view.longitude,
                    latitude=view.latitude,
                )
            )
            items.append(
                NearbyPlaceResponse(**place.model_dump(), distance_meters=view.distance_meters)
            )
        return NearbyPlacesResponse(
            items=items,
            count=len(items),
            radius_meters=radius_meters,
            limit=limit,
        )
