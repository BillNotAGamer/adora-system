"""FastAPI transport for partner administration and partner-scoped offers."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session
from app.modules.catalog.errors import (
    CatalogConflictError,
    CatalogNotFoundError,
    CatalogPolicyError,
)
from app.modules.catalog.repository import CatalogRepository
from app.modules.catalog.router import catalog_http_error
from app.modules.catalog.schemas import (
    OfferCreate,
    OfferListResponse,
    OfferResponse,
    OfferUpdate,
)
from app.modules.catalog.service import CatalogService, offer_response
from app.modules.identity.dependencies import (
    CurrentPrincipal,
    PartnerScope,
    require_admin,
    require_partner_scope,
    require_roles,
)
from app.modules.partner.repository import PartnerRepository
from app.modules.partner.schemas import (
    MembershipAssignment,
    MembershipResponse,
    MyPartnersResponse,
    PartnerCreate,
    PartnerListResponse,
    PartnerResponse,
    PartnerSelfUpdate,
    PartnerUpdate,
)
from app.modules.partner.service import PartnerService, membership_response, partner_response

router = APIRouter(tags=["partners"])
partner_or_admin = require_roles("partner", "admin")


def require_partner_manager(scope: PartnerScope) -> None:
    if scope.membership is not None and scope.membership.membership_role not in {
        "owner",
        "manager",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner or manager membership required",
        )


@router.get("/admin/partners", response_model=PartnerListResponse)
async def list_partners(
    _principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PartnerListResponse:
    partners = await PartnerRepository(session).list_partners(limit=limit, offset=offset)
    items = [partner_response(partner) for partner in partners]
    return PartnerListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.post(
    "/admin/partners", response_model=PartnerResponse, status_code=status.HTTP_201_CREATED
)
async def create_partner(
    payload: PartnerCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PartnerResponse:
    return await PartnerService(session).create_partner(payload, principal.user.id)


@router.get("/admin/partners/{partner_id}", response_model=PartnerResponse)
async def get_partner(
    partner_id: UUID,
    _principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PartnerResponse:
    partner = await PartnerRepository(session).get_partner(partner_id)
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner_response(partner)


@router.patch("/admin/partners/{partner_id}", response_model=PartnerResponse)
async def update_partner_admin(
    partner_id: UUID,
    payload: PartnerUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PartnerResponse:
    try:
        return await PartnerService(session).update_partner(partner_id, payload, principal.user.id)
    except CatalogNotFoundError as exc:
        raise catalog_http_error(exc) from exc


@router.put(
    "/admin/partners/{partner_id}/members/{user_id}",
    response_model=MembershipResponse,
)
async def assign_partner_membership(
    partner_id: UUID,
    user_id: UUID,
    payload: MembershipAssignment,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MembershipResponse:
    try:
        return await PartnerService(session).assign_membership(
            partner_id, user_id, payload, principal.user.id
        )
    except (CatalogNotFoundError, CatalogConflictError) as exc:
        raise catalog_http_error(exc) from exc


@router.delete(
    "/admin/partners/{partner_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_partner_membership(
    partner_id: UUID,
    user_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    try:
        await PartnerService(session).remove_membership(partner_id, user_id, principal.user.id)
    except CatalogNotFoundError as exc:
        raise catalog_http_error(exc) from exc


@router.get("/partners/me", response_model=MyPartnersResponse)
async def my_partners(
    principal: Annotated[CurrentPrincipal, Depends(partner_or_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MyPartnersResponse:
    memberships = await PartnerRepository(session).list_memberships_for_user(principal.user.id)
    return MyPartnersResponse(
        memberships=[
            membership_response(membership, include_partner=True) for membership in memberships
        ]
    )


@router.patch("/partners/{partner_id}", response_model=PartnerResponse)
async def update_own_partner(
    partner_id: UUID,
    payload: PartnerSelfUpdate,
    scope: Annotated[PartnerScope, Depends(require_partner_scope)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PartnerResponse:
    require_partner_manager(scope)
    try:
        return await PartnerService(session).update_partner(
            partner_id, payload, scope.principal.user.id
        )
    except CatalogNotFoundError as exc:
        raise catalog_http_error(exc) from exc


@router.get("/partners/{partner_id}/offers", response_model=OfferListResponse)
async def list_partner_offers(
    partner_id: UUID,
    _scope: Annotated[PartnerScope, Depends(require_partner_scope)],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OfferListResponse:
    offers = await CatalogRepository(session).list_offers(
        public_only=False,
        partner_id=partner_id,
        place_id=None,
        destination_id=None,
        kind=None,
        limit=limit,
        offset=offset,
    )
    items = [offer_response(offer) for offer in offers]
    return OfferListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.post(
    "/partners/{partner_id}/offers",
    response_model=OfferResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_partner_offer(
    partner_id: UUID,
    payload: OfferCreate,
    scope: Annotated[PartnerScope, Depends(require_partner_scope)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OfferResponse:
    require_partner_manager(scope)
    try:
        return await CatalogService(session).create_offer(
            partner_id,
            payload,
            scope.principal.user.id,
            admin_override=scope.membership is None,
        )
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.patch("/partners/{partner_id}/offers/{offer_id}", response_model=OfferResponse)
async def update_partner_offer(
    partner_id: UUID,
    offer_id: UUID,
    payload: OfferUpdate,
    scope: Annotated[PartnerScope, Depends(require_partner_scope)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OfferResponse:
    require_partner_manager(scope)
    try:
        return await CatalogService(session).update_offer(
            partner_id,
            offer_id,
            payload,
            scope.principal.user.id,
            admin_override=scope.membership is None,
        )
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc
