"""SQLAlchemy persistence operations for partner organizations and memberships."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.domain.models.identity import User
from app.domain.models.partner import Partner, PartnerMembership


class PartnerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_partners(self, *, limit: int, offset: int) -> list[Partner]:
        return list(
            (
                await self.session.scalars(
                    select(Partner)
                    .order_by(Partner.public_name, Partner.id)
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
        )

    async def get_partner(self, partner_id: UUID) -> Partner | None:
        return await self.session.get(Partner, partner_id)

    async def get_user(self, user_id: UUID) -> User | None:
        return (
            await self.session.execute(
                select(User).where(User.id == user_id).options(selectinload(User.roles))
            )
        ).scalar_one_or_none()

    async def get_membership(
        self, partner_id: UUID, user_id: UUID
    ) -> PartnerMembership | None:
        return await self.session.get(PartnerMembership, (partner_id, user_id))

    async def list_memberships_for_user(self, user_id: UUID) -> list[PartnerMembership]:
        return list(
            (
                await self.session.scalars(
                    select(PartnerMembership)
                    .where(PartnerMembership.user_id == user_id)
                    .options(joinedload(PartnerMembership.partner))
                    .order_by(PartnerMembership.created_at, PartnerMembership.partner_id)
                )
            ).all()
        )
