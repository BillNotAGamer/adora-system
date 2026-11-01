"""Destination, place, media, and service-offer mappings."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import (
    CHAR,
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.models.base import SCHEMA_NAME, Base

if TYPE_CHECKING:
    from app.domain.models.inventory import InventorySlot
    from app.domain.models.partner import Partner


class Destination(Base):
    __tablename__ = "destinations"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'hidden')"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    country_code: Mapped[str] = mapped_column(
        CHAR(2), nullable=False, server_default=text("'VN'::bpchar")
    )
    center: Mapped[Any | None] = mapped_column(Geography("POINT", srid=4326, spatial_index=False))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'::text"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    places: Mapped[list[Place]] = relationship(back_populates="destination")


class Place(Base):
    __tablename__ = "places"
    __table_args__ = (
        UniqueConstraint("destination_id", "slug"),
        CheckConstraint(
            "category IN ('attraction', 'hotel', 'restaurant', 'transport_hub', 'other')"
        ),
        CheckConstraint("jsonb_typeof(attributes) = 'object'"),
        CheckConstraint("status IN ('active', 'hidden', 'archived')"),
        Index("ix_places_location_gist", "location", postgresql_using="gist"),
        Index(
            "ix_places_destination_category",
            "destination_id",
            "category",
            postgresql_where=text("status = 'active'::text"),
        ),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    destination_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.destinations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[Any] = mapped_column(
        Geography("POINT", srid=4326, spatial_index=False), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text)
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'::text"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    destination: Mapped[Destination] = relationship(back_populates="places")
    media: Mapped[list[PlaceMedia]] = relationship(back_populates="place")
    departing_offers: Mapped[list[ServiceOffer]] = relationship(
        back_populates="place", foreign_keys="ServiceOffer.place_id"
    )
    arriving_offers: Mapped[list[ServiceOffer]] = relationship(
        back_populates="arrival_place", foreign_keys="ServiceOffer.arrival_place_id"
    )


class PlaceMedia(Base):
    __tablename__ = "place_media"
    __table_args__ = (
        UniqueConstraint("place_id", "media_key"),
        CheckConstraint("media_kind IN ('image', 'video')"),
        CheckConstraint("sort_order >= 0"),
        Index("ix_place_media_sort", "place_id", "sort_order"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    place_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    media_key: Mapped[str] = mapped_column(Text, nullable=False)
    media_kind: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    place: Mapped[Place] = relationship(back_populates="media")


class ServiceOffer(Base):
    __tablename__ = "service_offers"
    __table_args__ = (
        CheckConstraint("kind IN ('stay', 'transport', 'experience')"),
        CheckConstraint("base_price_vnd >= 0"),
        CheckConstraint("jsonb_typeof(attributes) = 'object'"),
        CheckConstraint("status IN ('draft', 'active', 'paused', 'archived')"),
        CheckConstraint(
            "(kind = 'transport' AND arrival_place_id IS NOT NULL "
            "AND arrival_place_id <> place_id) OR "
            "(kind <> 'transport' AND arrival_place_id IS NULL)"
        ),
        Index("ix_offers_partner_status", "partner_id", "status"),
        Index(
            "ix_offers_place_kind_active",
            "place_id",
            "kind",
            postgresql_where=text("status = 'active'::text"),
        ),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    partner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.partners.id", ondelete="RESTRICT"),
        nullable=False,
    )
    place_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    arrival_place_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey(f"{SCHEMA_NAME}.places.id", ondelete="RESTRICT")
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    base_price_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'draft'::text"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    partner: Mapped[Partner] = relationship(back_populates="service_offers")
    place: Mapped[Place] = relationship(back_populates="departing_offers", foreign_keys=[place_id])
    arrival_place: Mapped[Place | None] = relationship(
        back_populates="arriving_offers", foreign_keys=[arrival_place_id]
    )
    inventory_slots: Mapped[list[InventorySlot]] = relationship(back_populates="offer")
