"""Itinerary and AI-generation persistence mappings."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
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


class Itinerary(Base):
    __tablename__ = "itineraries"
    __table_args__ = (
        CheckConstraint("budget_vnd >= 0"),
        CheckConstraint("status IN ('draft', 'active', 'archived')"),
        CheckConstraint("source IN ('manual', 'ai')"),
        CheckConstraint("end_date >= start_date"),
        Index("ix_itineraries_user_created", "user_id", text("created_at DESC")),
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
    destination_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.destinations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    budget_vnd: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'draft'::text"))
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'manual'::text"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    items: Mapped[list[ItineraryItem]] = relationship(
        back_populates="itinerary", cascade="all, delete-orphan"
    )
    ai_generation_logs: Mapped[list[AIGenerationLog]] = relationship(back_populates="itinerary")


class ItineraryItem(Base):
    __tablename__ = "itinerary_items"
    __table_args__ = (
        UniqueConstraint("itinerary_id", "day_index", "sort_order"),
        CheckConstraint("day_index >= 1"),
        CheckConstraint("sort_order >= 0"),
        CheckConstraint("estimated_cost_vnd >= 0"),
        CheckConstraint(
            "planned_end_at IS NULL OR planned_start_at IS NULL OR "
            "planned_end_at > planned_start_at"
        ),
        Index("ix_itinerary_items_by_itinerary", "itinerary_id", "day_index", "sort_order"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    itinerary_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.itineraries.id", ondelete="CASCADE"),
        nullable=False,
    )
    place_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    offer_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey(f"{SCHEMA_NAME}.service_offers.id", ondelete="RESTRICT")
    )
    day_index: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    planned_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_cost_vnd: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default=text("0")
    )
    notes: Mapped[str | None] = mapped_column(Text)

    itinerary: Mapped[Itinerary] = relationship(back_populates="items")


class AIGenerationLog(Base):
    __tablename__ = "ai_generation_logs"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(input_summary) = 'object'"),
        CheckConstraint("jsonb_typeof(output_metadata) = 'object'"),
        CheckConstraint("validation_status IN ('accepted', 'rejected', 'failed')"),
        CheckConstraint("latency_ms >= 0"),
        CheckConstraint("length(request_hash) = 64"),
        Index("ix_ai_logs_user_created", "user_id", text("created_at DESC")),
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
    model_id: Mapped[str] = mapped_column(Text, nullable=False)
    request_hash: Mapped[str] = mapped_column(Text, nullable=False)
    input_summary: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    output_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    validation_status: Mapped[str] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    error_code: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    itinerary: Mapped[Itinerary | None] = relationship(back_populates="ai_generation_logs")
