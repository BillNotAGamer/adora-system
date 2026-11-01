"""Quote, booking, booking-item, and inventory-hold mappings."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
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
    from app.domain.models.inventory import InventorySlot
    from app.domain.models.payment import PaymentAttempt, Voucher


class BookingQuote(Base):
    __tablename__ = "booking_quotes"
    __table_args__ = (
        UniqueConstraint("id", "user_id"),
        CheckConstraint("total_vnd >= 0"),
        CheckConstraint("expires_at > created_at"),
        Index("ix_quotes_user_created", "user_id", text("created_at DESC")),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    itinerary_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey(f"{SCHEMA_NAME}.itineraries.id", ondelete="SET NULL")
    )
    total_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    items: Mapped[list[BookingQuoteItem]] = relationship(back_populates="quote")
    booking: Mapped[Booking | None] = relationship(
        back_populates="quote", uselist=False, foreign_keys="[Booking.quote_id, Booking.user_id]"
    )


class BookingQuoteItem(Base):
    __tablename__ = "booking_quote_items"
    __table_args__ = (
        UniqueConstraint("quote_id", "inventory_slot_id"),
        UniqueConstraint("id", "quote_id", "inventory_slot_id"),
        CheckConstraint("quantity > 0"),
        CheckConstraint("unit_price_vnd >= 0"),
        Index("ix_quote_items_slot", "inventory_slot_id"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    quote_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.booking_quotes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    inventory_slot_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.inventory_slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    offer_title_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_vnd: Mapped[int] = mapped_column(
        BigInteger, Computed("quantity::bigint * unit_price_vnd", persisted=True)
    )

    quote: Mapped[BookingQuote] = relationship(back_populates="items")
    inventory_slot: Mapped[InventorySlot] = relationship(back_populates="quote_items")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        ForeignKeyConstraint(
            ["quote_id", "user_id"],
            [f"{SCHEMA_NAME}.booking_quotes.id", f"{SCHEMA_NAME}.booking_quotes.user_id"],
            name="fk_bookings_quote_owner",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("id", "quote_id"),
        CheckConstraint("total_vnd >= 0"),
        CheckConstraint(
            "status IN ('held', 'payment_pending', 'confirmed', 'payment_failed', "
            "'expired', 'reconciliation_required', 'cancelled', 'refunded')"
        ),
        Index("ix_bookings_user_created", "user_id", text("created_at DESC")),
        Index(
            "ix_bookings_status_expiry",
            "status",
            "hold_expires_at",
            postgresql_where=text("status = ANY (ARRAY['held'::text, 'payment_pending'::text])"),
        ),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    booking_code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quote_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    total_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'held'::text"))
    hold_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    quote: Mapped[BookingQuote] = relationship(
        back_populates="booking", foreign_keys=[quote_id, user_id]
    )
    items: Mapped[list[BookingItem]] = relationship(
        back_populates="booking", foreign_keys="[BookingItem.booking_id, BookingItem.quote_id]"
    )
    payment_attempts: Mapped[list[PaymentAttempt]] = relationship(back_populates="booking")


class BookingItem(Base):
    __tablename__ = "booking_items"
    __table_args__ = (
        ForeignKeyConstraint(
            ["booking_id", "quote_id"],
            [f"{SCHEMA_NAME}.bookings.id", f"{SCHEMA_NAME}.bookings.quote_id"],
            name="fk_booking_item_booking_quote",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["quote_item_id", "quote_id", "inventory_slot_id"],
            [
                f"{SCHEMA_NAME}.booking_quote_items.id",
                f"{SCHEMA_NAME}.booking_quote_items.quote_id",
                f"{SCHEMA_NAME}.booking_quote_items.inventory_slot_id",
            ],
            name="fk_booking_item_quote_slot",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("booking_id", "inventory_slot_id"),
        UniqueConstraint("id", "inventory_slot_id"),
        CheckConstraint("quantity > 0"),
        CheckConstraint("unit_price_vnd >= 0"),
        Index("ix_booking_items_slot", "inventory_slot_id"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    booking_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    quote_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    quote_item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    inventory_slot_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.inventory_slots.id", ondelete="RESTRICT"),
        nullable=False,
    )
    offer_title_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_vnd: Mapped[int] = mapped_column(
        BigInteger, Computed("quantity::bigint * unit_price_vnd", persisted=True)
    )

    booking: Mapped[Booking] = relationship(
        back_populates="items", foreign_keys=[booking_id, quote_id]
    )
    inventory_hold: Mapped[InventoryHold | None] = relationship(
        back_populates="booking_item",
        uselist=False,
        foreign_keys="[InventoryHold.booking_item_id, InventoryHold.inventory_slot_id]",
    )
    vouchers: Mapped[list[Voucher]] = relationship(back_populates="booking_item")


class InventoryHold(Base):
    __tablename__ = "inventory_holds"
    __table_args__ = (
        ForeignKeyConstraint(
            ["booking_item_id", "inventory_slot_id"],
            [f"{SCHEMA_NAME}.booking_items.id", f"{SCHEMA_NAME}.booking_items.inventory_slot_id"],
            name="fk_hold_booking_item_slot",
            ondelete="RESTRICT",
        ),
        CheckConstraint("quantity > 0"),
        CheckConstraint("status IN ('active', 'consumed', 'released', 'expired')"),
        CheckConstraint("expires_at > created_at"),
        Index("ix_holds_expiring", "expires_at", postgresql_where=text("status = 'active'::text")),
        Index(
            "ix_holds_slot_active",
            "inventory_slot_id",
            postgresql_where=text("status = 'active'::text"),
        ),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    booking_item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    inventory_slot_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'::text"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    booking_item: Mapped[BookingItem] = relationship(
        back_populates="inventory_hold", foreign_keys=[booking_item_id, inventory_slot_id]
    )
