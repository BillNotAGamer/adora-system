"""Partner and partner-membership persistence mappings."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    PrimaryKeyConstraint,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.models.base import SCHEMA_NAME, Base

if TYPE_CHECKING:
    from app.domain.models.catalog import ServiceOffer
    from app.domain.models.identity import User


class Partner(Base):
    __tablename__ = "partners"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'suspended')"),
        {"schema": SCHEMA_NAME},
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    legal_name: Mapped[str] = mapped_column(Text, nullable=False)
    public_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'pending'::text")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    memberships: Mapped[list[PartnerMembership]] = relationship(back_populates="partner")
    service_offers: Mapped[list[ServiceOffer]] = relationship(back_populates="partner")


class PartnerMembership(Base):
    __tablename__ = "partner_memberships"
    __table_args__ = (
        PrimaryKeyConstraint("partner_id", "user_id"),
        CheckConstraint("membership_role IN ('owner', 'manager', 'staff')"),
        Index("ix_partner_memberships_user", "user_id", "partner_id"),
        {"schema": SCHEMA_NAME},
    )

    partner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.partners.id", ondelete="RESTRICT"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{SCHEMA_NAME}.users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    membership_role: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    partner: Mapped[Partner] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="partner_memberships")
