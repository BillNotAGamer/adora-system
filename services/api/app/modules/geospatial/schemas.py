"""Geospatial search response contracts."""

from pydantic import BaseModel

from app.modules.catalog.schemas import PlaceResponse


class NearbyPlaceResponse(PlaceResponse):
    distance_meters: float


class NearbyPlacesResponse(BaseModel):
    items: list[NearbyPlaceResponse]
    count: int
    radius_meters: float
    limit: int
    distance_semantics: str = "straight-line geodesic distance"
