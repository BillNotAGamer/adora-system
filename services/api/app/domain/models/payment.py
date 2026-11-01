"""Payment-attempt, gateway-event, and voucher mappings."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
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
    from app.domain.models.booking import Booking, BookingItem


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    __table_args__ = (
        UniqueConstraint("gateway", "gateway_reference"),
        CheckConstraint("gateway IN ('vnpay')"),
        CheckConstraint("expected_amount_vnd >= 0"),
        CheckConstraint(
            "status IN ('pending', 'succeeded', 'failed', 'refund_pending', 'refunded')"
        ),
        Index("ix_payment_attempts_booking", "booking_id", text("created_at DESC")),
        Index(
            "uq_one_settled_payment_per_booking",
            "booking_id",
            unique=True,
            postgresql_where=text(
                "status = ANY (ARRAY['succeeded'::text, 'refund_pending'::text, 'refunded'::text])"
            ),
        ),
        Index(
            "uq_gateway_transaction",
            "gateway",
            "gateway_transaction_id",
            unique=True,
            postgresql_where=text("gateway_transaction_id IS NOT NULL"),
        ),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    booking_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.bookings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    gateway: Mapped[str] = mapped_column(Text, nullable=False)
    gateway_reference: Mapped[str] = mapped_column(Text, nullable=False)
    gateway_transaction_id: Mapped[str | None] = mapped_column(Text)
    expected_amount_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pending'::text")
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    booking: Mapped[Booking] = relationship(back_populates="payment_attempts")
    events: Mapped[list[PaymentEvent]] = relationship(back_populates="payment_attempt")


class PaymentEvent(Base):
    __tablename__ = "payment_events"
    __table_args__ = (
        UniqueConstraint("gateway", "event_fingerprint"),
        CheckConstraint("gateway IN ('vnpay')"),
        CheckConstraint("amount_vnd >= 0"),
        CheckConstraint("event_status IN ('received', 'processed', 'ignored', 'rejected')"),
        CheckConstraint("jsonb_typeof(sanitized_payload) = 'object'"),
        CheckConstraint("length(event_fingerprint) = 64"),
        Index("ix_payment_events_attempt_received", "payment_attempt_id", text("received_at DESC")),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    payment_attempt_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey(f"{SCHEMA_NAME}.payment_attempts.id", ondelete="SET NULL")
    )
    gateway: Mapped[str] = mapped_column(Text, nullable=False)
    event_fingerprint: Mapped[str] = mapped_column(Text, nullable=False)
    checksum_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    amount_vnd: Mapped[int | None] = mapped_column(BigInteger)
    event_status: Mapped[str] = mapped_column(Text, nullable=False)
    sanitized_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    payment_attempt: Mapped[PaymentAttempt | None] = relationship(back_populates="events")


class Voucher(Base):
    __tablename__ = "vouchers"
    __table_args__ = (
        UniqueConstraint("booking_item_id", "unit_index"),
        CheckConstraint("unit_index > 0"),
        CheckConstraint("length(token_hash) = 64"),
        CheckConstraint("status IN ('active', 'redeemed', 'void')"),
        CheckConstraint("status <> 'redeemed' OR redeemed_at IS NOT NULL"),
        Index("ix_vouchers_booking_item", "booking_item_id"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    booking_item_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.booking_items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    unit_index: Mapped[int] = mapped_column(Integer, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'::text"))
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    booking_item: Mapped[BookingItem] = relationship(back_populates="vouchers")
