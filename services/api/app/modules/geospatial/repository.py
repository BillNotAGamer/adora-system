"""Bounded PostGIS geography queries for nearby places."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from geoalchemy2 import Geography, Geometry
from sqlalchemy import Select, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.catalog import Place


@dataclass(frozen=True)
class NearbyPlaceView:
    place: Place
    longitude: float
    latitude: float
    distance_meters: float


def nearby_places_statement(
    *,
    latitude: float,
    longitude: float,
    radius_meters: float,
    limit: int,
    destination_id: UUID | None,
    category: str | None,
) -> Select[tuple[Place, float, float, float]]:
    point = cast(
        func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
        Geography("POINT", srid=4326),
    )
    geometry = cast(Place.location, Geometry("POINT", srid=4326))
    distance = func.ST_Distance(Place.location, point).label("distance_meters")
    statement = select(
        Place,
        func.ST_X(geometry).label("longitude"),
        func.ST_Y(geometry).label("latitude"),
        distance,
    ).where(
        Place.status == "active",
        func.ST_DWithin(Place.location, point, radius_meters),
    )
    if destination_id is not None:
        statement = statement.where(Place.destination_id == destination_id)
    if category is not None:
        statement = statement.where(Place.category == category)
    return statement.order_by(distance, Place.id).limit(limit)


class GeospatialRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def nearby_places(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: float,
        limit: int,
        destination_id: UUID | None,
        category: str | None,
    ) -> list[NearbyPlaceView]:
        rows = (
            await self.session.execute(
                nearby_places_statement(
                    latitude=latitude,
                    longitude=longitude,
                    radius_meters=radius_meters,
                    limit=limit,
                    destination_id=destination_id,
                    category=category,
                )
            )
        ).all()
        return [NearbyPlaceView(row[0], row[1], row[2], row[3]) for row in rows]
