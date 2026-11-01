"""Database-backed authentication, RBAC, and partner-isolation dependencies."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.domain.models.identity import User
from app.domain.models.partner import PartnerMembership
from app.infrastructure.database import get_session
from app.modules.identity.errors import InvalidAccessTokenError
from app.modules.identity.repository import IdentityRepository
from app.modules.identity.security import AccessClaims, decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentPrincipal:
    user: User
    roles: frozenset[str]
    claims: AccessClaims


async def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CurrentPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = decode_access_token(credentials.credentials, get_settings())
    except InvalidAccessTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    user = await IdentityRepository(session).get_user_by_id(claims.subject)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
    return CurrentPrincipal(
        user=user,
        roles=frozenset(role.role for role in user.roles),
        claims=claims,
    )


def require_roles(*required_roles: str):  # type: ignore[no-untyped-def]
    async def dependency(
        principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
    ) -> CurrentPrincipal:
        if not principal.roles.intersection(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return principal

    return dependency


require_admin = require_roles("admin")


@dataclass(frozen=True)
class PartnerScope:
    principal: CurrentPrincipal
    partner_id: UUID
    membership: PartnerMembership | None


async def require_partner_scope(
    partner_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PartnerScope:
    if "admin" in principal.roles:
        return PartnerScope(principal=principal, partner_id=partner_id, membership=None)
    if "partner" not in principal.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Partner role required")
    membership = await IdentityRepository(session).get_partner_membership(
        principal.user.id, partner_id
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Partner access denied")
    return PartnerScope(principal=principal, partner_id=partner_id, membership=membership)
