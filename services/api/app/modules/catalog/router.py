"""FastAPI transport for public and administrator catalog operations."""

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
from app.modules.catalog.schemas import (
    DestinationCreate,
    DestinationListResponse,
    DestinationResponse,
    DestinationUpdate,
    OfferKind,
    OfferListResponse,
    OfferResponse,
    PlaceCategory,
    PlaceCreate,
    PlaceListResponse,
    PlaceMediaCreate,
    PlaceMediaResponse,
    PlaceMediaUpdate,
    PlaceResponse,
    PlaceUpdate,
)
from app.modules.catalog.service import (
    CatalogService,
    destination_response,
    media_response,
    offer_response,
    place_response,
)
from app.modules.identity.dependencies import CurrentPrincipal, require_admin

router = APIRouter(tags=["catalog"])


def catalog_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, CatalogNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, CatalogConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, CatalogPolicyError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return HTTPException(status_code=500, detail="Unexpected catalog error")


@router.get("/destinations", response_model=DestinationListResponse)
async def list_destinations(
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> DestinationListResponse:
    views = await CatalogRepository(session).list_destinations(
        public_only=True, limit=limit, offset=offset
    )
    items = [destination_response(view) for view in views]
    return DestinationListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.get("/destinations/{destination_id}", response_model=DestinationResponse)
async def get_destination(
    destination_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DestinationResponse:
    view = await CatalogRepository(session).get_destination(destination_id, public_only=True)
    if view is None:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination_response(view)


@router.get("/admin/destinations", response_model=DestinationListResponse)
async def list_admin_destinations(
    _principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> DestinationListResponse:
    views = await CatalogRepository(session).list_destinations(
        public_only=False, limit=limit, offset=offset
    )
    items = [destination_response(view) for view in views]
    return DestinationListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.post(
    "/admin/destinations",
    response_model=DestinationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_destination(
    payload: DestinationCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DestinationResponse:
    try:
        return await CatalogService(session).create_destination(payload, principal.user.id)
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.patch("/admin/destinations/{destination_id}", response_model=DestinationResponse)
async def update_destination(
    destination_id: UUID,
    payload: DestinationUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DestinationResponse:
    try:
        return await CatalogService(session).update_destination(
            destination_id, payload, principal.user.id
        )
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.get("/places", response_model=PlaceListResponse)
async def list_places(
    session: Annotated[AsyncSession, Depends(get_session)],
    destination_id: UUID | None = None,
    category: PlaceCategory | None = None,
    search: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PlaceListResponse:
    views = await CatalogRepository(session).list_places(
        public_only=True,
        destination_id=destination_id,
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )
    items = [place_response(view) for view in views]
    return PlaceListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.get("/places/{place_id}", response_model=PlaceResponse)
async def get_place(
    place_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceResponse:
    view = await CatalogRepository(session).get_place(place_id, public_only=True)
    if view is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place_response(view)


@router.get("/places/{place_id}/media", response_model=list[PlaceMediaResponse])
async def list_place_media(
    place_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlaceMediaResponse]:
    repository = CatalogRepository(session)
    if await repository.get_place(place_id, public_only=True) is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return [media_response(media) for media in await repository.list_media(place_id)]


@router.get("/admin/places", response_model=PlaceListResponse)
async def list_admin_places(
    _principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
    destination_id: UUID | None = None,
    category: PlaceCategory | None = None,
    search: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PlaceListResponse:
    views = await CatalogRepository(session).list_places(
        public_only=False,
        destination_id=destination_id,
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )
    items = [place_response(view) for view in views]
    return PlaceListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.post("/admin/places", response_model=PlaceResponse, status_code=status.HTTP_201_CREATED)
async def create_place(
    payload: PlaceCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceResponse:
    try:
        return await CatalogService(session).create_place(payload, principal.user.id)
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.patch("/admin/places/{place_id}", response_model=PlaceResponse)
async def update_place(
    place_id: UUID,
    payload: PlaceUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceResponse:
    try:
        return await CatalogService(session).update_place(place_id, payload, principal.user.id)
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.post(
    "/admin/places/{place_id}/media",
    response_model=PlaceMediaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_place_media(
    place_id: UUID,
    payload: PlaceMediaCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceMediaResponse:
    try:
        return await CatalogService(session).create_media(place_id, payload, principal.user.id)
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.patch("/admin/place-media/{media_id}", response_model=PlaceMediaResponse)
async def update_place_media(
    media_id: UUID,
    payload: PlaceMediaUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlaceMediaResponse:
    try:
        return await CatalogService(session).update_media(media_id, payload, principal.user.id)
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.delete("/admin/place-media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_place_media(
    media_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_admin)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    try:
        await CatalogService(session).delete_media(media_id, principal.user.id)
    except (CatalogNotFoundError, CatalogConflictError, CatalogPolicyError) as exc:
        raise catalog_http_error(exc) from exc


@router.get("/offers", response_model=OfferListResponse)
async def list_offers(
    session: Annotated[AsyncSession, Depends(get_session)],
    partner_id: UUID | None = None,
    place_id: UUID | None = None,
    destination_id: UUID | None = None,
    kind: OfferKind | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OfferListResponse:
    offers = await CatalogRepository(session).list_offers(
        public_only=True,
        partner_id=partner_id,
        place_id=place_id,
        destination_id=destination_id,
        kind=kind,
        limit=limit,
        offset=offset,
    )
    items = [offer_response(offer) for offer in offers]
    return OfferListResponse(items=items, count=len(items), limit=limit, offset=offset)


@router.get("/offers/{offer_id}", response_model=OfferResponse)
async def get_offer(
    offer_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OfferResponse:
    offer = await CatalogRepository(session).get_offer(offer_id, public_only=True)
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer_response(offer)
