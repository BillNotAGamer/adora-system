"""Explicit SQLAlchemy persistence operations for the identity module."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models.governance import AuditLog
from app.domain.models.identity import RefreshSession, User
from app.domain.models.partner import PartnerMembership


class IdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email).options(selectinload(User.roles))
        )
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id).options(selectinload(User.roles))
        )
        return result.scalar_one_or_none()

    async def get_refresh_session_for_update(self, token_hash: str) -> RefreshSession | None:
        result = await self.session.execute(
            select(RefreshSession)
            .where(RefreshSession.token_hash == token_hash)
            .options(selectinload(RefreshSession.user).selectinload(User.roles))
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def revoke_active_sessions(self, user_id: UUID, revoked_at: datetime) -> None:
        await self.session.execute(
            update(RefreshSession)
            .where(
                RefreshSession.user_id == user_id,
                RefreshSession.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
        )

    async def get_partner_membership(
        self, user_id: UUID, partner_id: UUID
    ) -> PartnerMembership | None:
        result = await self.session.execute(
            select(PartnerMembership).where(
                PartnerMembership.user_id == user_id,
                PartnerMembership.partner_id == partner_id,
            )
        )
        return result.scalar_one_or_none()

    def add_audit_event(
        self,
        action: str,
        *,
        actor_user_id: UUID | None,
        entity_type: str = "identity",
        entity_id: UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.session.add(
            AuditLog(
                actor_user_id=actor_user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                event_metadata=metadata or {},
            )
        )
