"""RBAC and partner-resource isolation tests."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.identity import User, UserRole
from app.domain.models.partner import Partner, PartnerMembership
from app.modules.identity.dependencies import (
    CurrentPrincipal,
    require_partner_scope,
    require_roles,
)
from app.modules.identity.security import AccessClaims


def principal(user: User, *roles: str) -> CurrentPrincipal:
    return CurrentPrincipal(
        user=user,
        roles=frozenset(roles),
        claims=AccessClaims(
            subject=user.id,
            token_id=uuid4(),
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
        ),
    )


@pytest.mark.asyncio
async def test_role_checks_support_multiple_roles_and_reject_escalation() -> None:
    user = User(
        id=uuid4(),
        email=f"phase11-rbac-{uuid4().hex}@example.com",
        password_hash="unused",
        display_name="RBAC",
    )
    traveler_or_partner = require_roles("traveler", "partner")
    admin_only = require_roles("admin")
    multi_role = principal(user, "traveler", "partner")

    assert await traveler_or_partner(multi_role) is multi_role
    with pytest.raises(HTTPException) as denied:
        await admin_only(multi_role)
    assert denied.value.status_code == 403
    assert await admin_only(principal(user, "admin"))


@pytest.mark.asyncio
async def test_partner_membership_scopes_resources_and_admin_may_override(
    db_session: AsyncSession,
) -> None:
    user = User(
        email=f"phase11-partner-{uuid4().hex}@example.com",
        password_hash="unused",
        display_name="Partner User",
    )
    user.roles.append(UserRole(role="partner"))
    owned = Partner(legal_name="Owned Legal", public_name="Owned")
    other = Partner(legal_name="Other Legal", public_name="Other")
    async with db_session.begin():
        db_session.add_all([user, owned, other])
        await db_session.flush()
        db_session.add(
            PartnerMembership(
                partner_id=owned.id,
                user_id=user.id,
                membership_role="owner",
            )
        )

    partner_principal = principal(user, "partner")
    scope = await require_partner_scope(owned.id, partner_principal, db_session)
    assert scope.membership is not None
    assert scope.membership.membership_role == "owner"

    with pytest.raises(HTTPException) as cross_partner:
        await require_partner_scope(other.id, partner_principal, db_session)
    assert cross_partner.value.status_code == 403

    traveler = principal(user, "traveler")
    with pytest.raises(HTTPException) as traveler_denied:
        await require_partner_scope(owned.id, traveler, db_session)
    assert traveler_denied.value.status_code == 403

    admin_scope = await require_partner_scope(other.id, principal(user, "admin"), db_session)
    assert admin_scope.membership is None
