"""Bookable inventory-slot persistence mapping."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
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
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.models.base import SCHEMA_NAME, Base

if TYPE_CHECKING:
    from app.domain.models.booking import BookingQuoteItem
    from app.domain.models.catalog import ServiceOffer


class InventorySlot(Base):
    __tablename__ = "inventory_slots"
    __table_args__ = (
        UniqueConstraint("offer_id", "service_start_at", "service_end_at"),
        CheckConstraint("capacity > 0"),
        CheckConstraint("held_quantity >= 0"),
        CheckConstraint("confirmed_quantity >= 0"),
        CheckConstraint("override_unit_price_vnd >= 0"),
        CheckConstraint("status IN ('open', 'closed')"),
        CheckConstraint("service_end_at > service_start_at"),
        CheckConstraint("held_quantity + confirmed_quantity <= capacity"),
        Index(
            "ix_inventory_offer_date",
            "offer_id",
            "service_start_at",
            postgresql_where=text("status = 'open'::text"),
        ),
        Index("ix_inventory_start_date", "service_start_at"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    offer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.service_offers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    service_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    service_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    held_quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    confirmed_quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    override_unit_price_vnd: Mapped[int | None] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'open'::text"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    offer: Mapped[ServiceOffer] = relationship(back_populates="inventory_slots")
    quote_items: Mapped[list[BookingQuoteItem]] = relationship(back_populates="inventory_slot")
