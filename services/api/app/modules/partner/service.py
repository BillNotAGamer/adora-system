"""Transactional partner and membership use cases."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.governance import AuditLog
from app.domain.models.identity import UserRole
from app.domain.models.partner import Partner, PartnerMembership
from app.modules.catalog.errors import CatalogConflictError, CatalogNotFoundError
from app.modules.partner.repository import PartnerRepository
from app.modules.partner.schemas import (
    MembershipAssignment,
    MembershipResponse,
    PartnerCreate,
    PartnerResponse,
    PartnerSelfUpdate,
    PartnerUpdate,
)


def partner_response(partner: Partner) -> PartnerResponse:
    return PartnerResponse(
        id=partner.id,
        legal_name=partner.legal_name,
        public_name=partner.public_name,
        status=partner.status,
        created_at=partner.created_at,
        updated_at=partner.updated_at,
    )


def membership_response(
    membership: PartnerMembership, *, include_partner: bool
) -> MembershipResponse:
    return MembershipResponse(
        partner_id=membership.partner_id,
        user_id=membership.user_id,
        membership_role=membership.membership_role,
        created_at=membership.created_at,
        partner=partner_response(membership.partner) if include_partner else None,
    )


class PartnerService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = PartnerRepository(session)

    def _audit(self, action: str, actor_id: UUID, entity_type: str, entity_id: UUID) -> None:
        self.session.add(
            AuditLog(
                actor_user_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
            )
        )

    async def create_partner(self, payload: PartnerCreate, actor_id: UUID) -> PartnerResponse:
        partner = Partner(**payload.model_dump())
        async with self.session.begin():
            self.session.add(partner)
            await self.session.flush()
            self._audit("partner.created", actor_id, "partner", partner.id)
        return partner_response(partner)

    async def update_partner(
        self,
        partner_id: UUID,
        payload: PartnerUpdate | PartnerSelfUpdate,
        actor_id: UUID,
    ) -> PartnerResponse:
        async with self.session.begin():
            partner = await self.repository.get_partner(partner_id)
            if partner is None:
                raise CatalogNotFoundError("Partner not found")
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(partner, field, value)
            partner.updated_at = datetime.now(UTC)
            self._audit("partner.updated", actor_id, "partner", partner.id)
            await self.session.flush()
        return partner_response(partner)

    async def assign_membership(
        self,
        partner_id: UUID,
        user_id: UUID,
        payload: MembershipAssignment,
        actor_id: UUID,
    ) -> MembershipResponse:
        try:
            async with self.session.begin():
                partner = await self.repository.get_partner(partner_id)
                if partner is None:
                    raise CatalogNotFoundError("Partner not found")
                user = await self.repository.get_user(user_id)
                if user is None:
                    raise CatalogNotFoundError("User not found")
                membership = await self.repository.get_membership(partner_id, user_id)
                if membership is None:
                    membership = PartnerMembership(
                        partner_id=partner_id,
                        user_id=user_id,
                        membership_role=payload.membership_role,
                    )
                    self.session.add(membership)
                else:
                    membership.membership_role = payload.membership_role
                if all(role.role != "partner" for role in user.roles):
                    self.session.add(UserRole(user_id=user_id, role="partner"))
                await self.session.flush()
                self._audit("partner.membership_assigned", actor_id, "partner", partner_id)
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflictError(
                "Membership assignment conflicts with existing data"
            ) from exc
        return membership_response(membership, include_partner=False)

    async def remove_membership(self, partner_id: UUID, user_id: UUID, actor_id: UUID) -> None:
        async with self.session.begin():
            membership = await self.repository.get_membership(partner_id, user_id)
            if membership is None:
                raise CatalogNotFoundError("Partner membership not found")
            self._audit("partner.membership_removed", actor_id, "partner", partner_id)
            await self.session.delete(membership)
