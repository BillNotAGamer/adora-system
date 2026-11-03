"""Transactional travel-catalog use cases independent of HTTP transport."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.catalog import Destination, Place, PlaceMedia, ServiceOffer
from app.domain.models.governance import AuditLog
from app.modules.catalog.errors import (
    CatalogConflictError,
    CatalogNotFoundError,
    CatalogPolicyError,
)
from app.modules.catalog.repository import CatalogRepository, DestinationView, PlaceView
from app.modules.catalog.schemas import (
    DestinationCreate,
    DestinationResponse,
    DestinationUpdate,
    OfferCreate,
    OfferResponse,
    OfferUpdate,
    PlaceCreate,
    PlaceMediaCreate,
    PlaceMediaResponse,
    PlaceMediaUpdate,
    PlaceResponse,
    PlaceUpdate,
)


def geography_point(longitude: float, latitude: float) -> WKTElement:
    """Construct a WGS84 point in the database's required longitude/latitude order."""

    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def destination_response(view: DestinationView) -> DestinationResponse:
    destination = view.destination
    return DestinationResponse(
        id=destination.id,
        slug=destination.slug,
        name=destination.name,
        country_code=destination.country_code.strip(),
        longitude=view.longitude,
        latitude=view.latitude,
        status=destination.status,
        created_at=destination.created_at,
    )


def place_response(view: PlaceView) -> PlaceResponse:
    place = view.place
    return PlaceResponse(
        id=place.id,
        destination_id=place.destination_id,
        slug=place.slug,
        name=place.name,
        category=place.category,
        longitude=view.longitude,
        latitude=view.latitude,
        description=place.description,
        attributes=place.attributes,
        status=place.status,
        created_at=place.created_at,
        updated_at=place.updated_at,
    )


def media_response(media: PlaceMedia) -> PlaceMediaResponse:
    return PlaceMediaResponse(
        id=media.id,
        place_id=media.place_id,
        media_key=media.media_key,
        media_kind=media.media_kind,
        sort_order=media.sort_order,
        created_at=media.created_at,
    )


def offer_response(offer: ServiceOffer) -> OfferResponse:
    return OfferResponse(
        id=offer.id,
        partner_id=offer.partner_id,
        place_id=offer.place_id,
        arrival_place_id=offer.arrival_place_id,
        title=offer.title,
        kind=offer.kind,
        description=offer.description,
        base_price_vnd=offer.base_price_vnd,
        attributes=offer.attributes,
        status=offer.status,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )


class CatalogService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = CatalogRepository(session)

    def _audit(self, action: str, actor_id: UUID, entity_type: str, entity_id: UUID) -> None:
        self.session.add(
            AuditLog(
                actor_user_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
            )
        )

    async def create_destination(
        self, payload: DestinationCreate, actor_id: UUID
    ) -> DestinationResponse:
        destination = Destination(
            slug=payload.slug,
            name=payload.name,
            country_code=payload.country_code,
            center=(
                geography_point(payload.longitude, payload.latitude)
                if payload.longitude is not None and payload.latitude is not None
                else None
            ),
            status=payload.status,
        )
        try:
            async with self.session.begin():
                self.session.add(destination)
                await self.session.flush()
                self._audit("catalog.destination_created", actor_id, "destination", destination.id)
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError("Destination slug already exists") from exc
        view = await self.repository.get_destination(destination.id)
        if view is None:
            raise CatalogNotFoundError("Destination was not found after creation")
        return destination_response(view)

    async def update_destination(
        self, destination_id: UUID, payload: DestinationUpdate, actor_id: UUID
    ) -> DestinationResponse:
        try:
            async with self.session.begin():
                destination = await self.repository.get_destination_model(destination_id)
                if destination is None:
                    raise CatalogNotFoundError("Destination not found")
                changes = payload.model_dump(
                    exclude_unset=True, exclude={"latitude", "longitude"}
                )
                for field, value in changes.items():
                    setattr(destination, field, value)
                if "latitude" in payload.model_fields_set:
                    assert payload.longitude is not None and payload.latitude is not None
                    destination.center = geography_point(payload.longitude, payload.latitude)
                self._audit("catalog.destination_updated", actor_id, "destination", destination.id)
                await self.session.flush()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError("Destination update conflicts with existing data") from exc
        view = await self.repository.get_destination(destination_id)
        if view is None:
            raise CatalogNotFoundError("Destination not found")
        return destination_response(view)

    async def create_place(self, payload: PlaceCreate, actor_id: UUID) -> PlaceResponse:
        place = Place(
            destination_id=payload.destination_id,
            slug=payload.slug,
            name=payload.name,
            category=payload.category,
            location=geography_point(payload.longitude, payload.latitude),
            description=payload.description,
            attributes=payload.attributes,
            status=payload.status,
        )
        try:
            async with self.session.begin():
                destination = await self.repository.get_destination_model(payload.destination_id)
                if destination is None:
                    raise CatalogNotFoundError("Destination not found")
                self.session.add(place)
                await self.session.flush()
                self._audit("catalog.place_created", actor_id, "place", place.id)
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError(
                "Place slug already exists in this destination or references are invalid"
            ) from exc
        view = await self.repository.get_place(place.id)
        if view is None:
            raise CatalogNotFoundError("Place was not found after creation")
        return place_response(view)

    async def update_place(
        self, place_id: UUID, payload: PlaceUpdate, actor_id: UUID
    ) -> PlaceResponse:
        try:
            async with self.session.begin():
                place = await self.repository.get_place_model(place_id)
                if place is None:
                    raise CatalogNotFoundError("Place not found")
                if payload.destination_id is not None:
                    destination = await self.repository.get_destination_model(
                        payload.destination_id
                    )
                    if destination is None:
                        raise CatalogNotFoundError("Destination not found")
                changes = payload.model_dump(
                    exclude_unset=True, exclude={"latitude", "longitude"}
                )
                for field, value in changes.items():
                    setattr(place, field, value)
                if "latitude" in payload.model_fields_set:
                    assert payload.longitude is not None and payload.latitude is not None
                    place.location = geography_point(payload.longitude, payload.latitude)
                place.updated_at = datetime.now(UTC)
                self._audit("catalog.place_updated", actor_id, "place", place.id)
                await self.session.flush()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError(
                "Place update conflicts with existing data or references"
            ) from exc
        view = await self.repository.get_place(place_id)
        if view is None:
            raise CatalogNotFoundError("Place not found")
        return place_response(view)

    async def create_media(
        self, place_id: UUID, payload: PlaceMediaCreate, actor_id: UUID
    ) -> PlaceMediaResponse:
        media = PlaceMedia(place_id=place_id, **payload.model_dump())
        try:
            async with self.session.begin():
                if await self.repository.get_place_model(place_id) is None:
                    raise CatalogNotFoundError("Place not found")
                self.session.add(media)
                await self.session.flush()
                self._audit("catalog.place_media_created", actor_id, "place_media", media.id)
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError("Media key already exists for this place") from exc
        return media_response(media)

    async def update_media(
        self, media_id: UUID, payload: PlaceMediaUpdate, actor_id: UUID
    ) -> PlaceMediaResponse:
        try:
            async with self.session.begin():
                media = await self.repository.get_media(media_id)
                if media is None:
                    raise CatalogNotFoundError("Place media not found")
                for field, value in payload.model_dump(exclude_unset=True).items():
                    setattr(media, field, value)
                self._audit("catalog.place_media_updated", actor_id, "place_media", media.id)
                await self.session.flush()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError("Media update conflicts with existing data") from exc
        return media_response(media)

    async def delete_media(self, media_id: UUID, actor_id: UUID) -> None:
        async with self.session.begin():
            media = await self.repository.get_media(media_id)
            if media is None:
                raise CatalogNotFoundError("Place media not found")
            self._audit("catalog.place_media_removed", actor_id, "place_media", media.id)
            await self.session.delete(media)

    async def create_offer(
        self,
        partner_id: UUID,
        payload: OfferCreate,
        actor_id: UUID,
        *,
        admin_override: bool,
    ) -> OfferResponse:
        offer = ServiceOffer(partner_id=partner_id, **payload.model_dump())
        try:
            async with self.session.begin():
                partner = await self.repository.get_partner(partner_id)
                if partner is None:
                    raise CatalogNotFoundError("Partner not found")
                await self._validate_offer_places(payload.place_id, payload.arrival_place_id)
                if (
                    payload.status == "active"
                    and partner.status != "approved"
                    and not admin_override
                ):
                    raise CatalogPolicyError("Only approved partners may publish active offers")
                self.session.add(offer)
                await self.session.flush()
                self._audit("catalog.offer_created", actor_id, "service_offer", offer.id)
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError("Offer violates catalog constraints") from exc
        return offer_response(offer)

    async def update_offer(
        self,
        partner_id: UUID,
        offer_id: UUID,
        payload: OfferUpdate,
        actor_id: UUID,
        *,
        admin_override: bool,
    ) -> OfferResponse:
        try:
            async with self.session.begin():
                offer = await self.repository.get_offer(offer_id)
                if offer is None or offer.partner_id != partner_id:
                    raise CatalogNotFoundError("Offer not found for this partner")
                final_kind = payload.kind or offer.kind
                final_place_id = payload.place_id or offer.place_id
                final_arrival = (
                    payload.arrival_place_id
                    if "arrival_place_id" in payload.model_fields_set
                    else offer.arrival_place_id
                )
                if final_kind == "transport":
                    if final_arrival is None or final_arrival == final_place_id:
                        raise CatalogPolicyError(
                            "Transport offers require a distinct arrival place"
                        )
                elif final_arrival is not None:
                    raise CatalogPolicyError(
                        "arrival_place_id is only valid for transport offers"
                    )
                await self._validate_offer_places(final_place_id, final_arrival)
                partner = await self.repository.get_partner(partner_id)
                final_status = payload.status or offer.status
                if (
                    final_status == "active"
                    and partner is not None
                    and partner.status != "approved"
                    and not admin_override
                ):
                    raise CatalogPolicyError("Only approved partners may publish active offers")
                for field, value in payload.model_dump(exclude_unset=True).items():
                    setattr(offer, field, value)
                offer.updated_at = datetime.now(UTC)
                self._audit("catalog.offer_updated", actor_id, "service_offer", offer.id)
                await self.session.flush()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError("Offer update violates catalog constraints") from exc
        return offer_response(offer)

    async def _validate_offer_places(
        self, place_id: UUID, arrival_place_id: UUID | None
    ) -> None:
        if await self.repository.get_place_model(place_id) is None:
            raise CatalogNotFoundError("Offer place not found")
        if arrival_place_id is not None and await self.repository.get_place_model(
            arrival_place_id
        ) is None:
            raise CatalogNotFoundError("Offer arrival place not found")
