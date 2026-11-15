"""Explicit SQLAlchemy queries for destinations, places, media, and offers."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from geoalchemy2 import Geometry
from sqlalchemy import Select, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.domain.models.catalog import Destination, Place, PlaceMedia, ServiceOffer
from app.domain.models.partner import Partner


@dataclass(frozen=True)
class DestinationView:
    destination: Destination
    longitude: float | None
    latitude: float | None


@dataclass(frozen=True)
class PlaceView:
    place: Place
    longitude: float
    latitude: float


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class CatalogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _destination_coordinates() -> tuple[ColumnElement[float], ColumnElement[float]]:
        geometry = cast(Destination.center, Geometry("POINT", srid=4326))
        return func.ST_X(geometry), func.ST_Y(geometry)

    @staticmethod
    def _place_coordinates() -> tuple[ColumnElement[float], ColumnElement[float]]:
        geometry = cast(Place.location, Geometry("POINT", srid=4326))
        return func.ST_X(geometry), func.ST_Y(geometry)

    async def list_destinations(
        self, *, public_only: bool, limit: int, offset: int
    ) -> list[DestinationView]:
        longitude, latitude = self._destination_coordinates()
        statement = select(Destination, longitude, latitude).order_by(
            Destination.name, Destination.id
        )
        if public_only:
            statement = statement.where(Destination.status == "active")
        rows = (await self.session.execute(statement.limit(limit).offset(offset))).all()
        return [DestinationView(row[0], row[1], row[2]) for row in rows]

    async def get_destination(
        self, destination_id: UUID, *, public_only: bool = False
    ) -> DestinationView | None:
        longitude, latitude = self._destination_coordinates()
        statement = select(Destination, longitude, latitude).where(Destination.id == destination_id)
        if public_only:
            statement = statement.where(Destination.status == "active")
        row = (await self.session.execute(statement)).one_or_none()
        return DestinationView(row[0], row[1], row[2]) if row else None

    async def get_destination_model(self, destination_id: UUID) -> Destination | None:
        return await self.session.get(Destination, destination_id)

    async def get_destination_by_slug(self, slug: str) -> Destination | None:
        return (
            await self.session.execute(select(Destination).where(Destination.slug == slug))
        ).scalar_one_or_none()

    async def list_places(
        self,
        *,
        public_only: bool,
        destination_id: UUID | None,
        category: str | None,
        search: str | None,
        limit: int,
        offset: int,
    ) -> list[PlaceView]:
        longitude, latitude = self._place_coordinates()
        statement: Select[tuple[Place, float, float]] = select(Place, longitude, latitude)
        if public_only:
            statement = statement.where(Place.status == "active")
        if destination_id:
            statement = statement.where(Place.destination_id == destination_id)
        if category:
            statement = statement.where(Place.category == category)
        if search:
            statement = statement.where(
                Place.name.ilike(f"%{escape_like(search.strip())}%", escape="\\")
            )
        rows = (
            await self.session.execute(
                statement.order_by(Place.name, Place.id).limit(limit).offset(offset)
            )
        ).all()
        return [PlaceView(row[0], row[1], row[2]) for row in rows]

    async def get_place(self, place_id: UUID, *, public_only: bool = False) -> PlaceView | None:
        longitude, latitude = self._place_coordinates()
        statement = select(Place, longitude, latitude).where(Place.id == place_id)
        if public_only:
            statement = statement.where(Place.status == "active")
        row = (await self.session.execute(statement)).one_or_none()
        return PlaceView(row[0], row[1], row[2]) if row else None

    async def get_place_model(self, place_id: UUID) -> Place | None:
        return await self.session.get(Place, place_id)

    async def list_media(self, place_id: UUID) -> list[PlaceMedia]:
        return list(
            (
                await self.session.scalars(
                    select(PlaceMedia)
                    .where(PlaceMedia.place_id == place_id)
                    .order_by(PlaceMedia.sort_order, PlaceMedia.id)
                )
            ).all()
        )

    async def get_media(self, media_id: UUID) -> PlaceMedia | None:
        return await self.session.get(PlaceMedia, media_id)

    async def get_partner(self, partner_id: UUID) -> Partner | None:
        return await self.session.get(Partner, partner_id)

    async def list_offers(
        self,
        *,
        public_only: bool,
        partner_id: UUID | None,
        place_id: UUID | None,
        destination_id: UUID | None,
        kind: str | None,
        limit: int,
        offset: int,
    ) -> list[ServiceOffer]:
        statement = select(ServiceOffer)
        if destination_id is not None:
            statement = statement.join(Place, ServiceOffer.place_id == Place.id).where(
                Place.destination_id == destination_id
            )
        if public_only:
            statement = statement.where(ServiceOffer.status == "active")
        if partner_id:
            statement = statement.where(ServiceOffer.partner_id == partner_id)
        if place_id:
            statement = statement.where(ServiceOffer.place_id == place_id)
        if kind:
            statement = statement.where(ServiceOffer.kind == kind)
        return list(
            (
                await self.session.scalars(
                    statement.order_by(ServiceOffer.title, ServiceOffer.id)
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
        )

    async def get_offer(
        self, offer_id: UUID, *, public_only: bool = False
    ) -> ServiceOffer | None:
        statement = select(ServiceOffer).where(ServiceOffer.id == offer_id)
        if public_only:
            statement = statement.where(ServiceOffer.status == "active")
        return (await self.session.execute(statement)).scalar_one_or_none()
