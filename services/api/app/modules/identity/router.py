"""FastAPI transport adapter for registration and session lifecycle."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.infrastructure.database import get_session
from app.infrastructure.rate_limit import (
    AuthRateLimiter,
    RateLimitExceeded,
    RateLimitUnavailable,
)
from app.modules.identity.dependencies import CurrentPrincipal, get_current_principal
from app.modules.identity.errors import (
    DuplicateEmailError,
    InactiveAccountError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)
from app.modules.identity.schemas import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    RegistrationResponse,
    TokenResponse,
    UserResponse,
)
from app.modules.identity.service import (
    AuthResult,
    IdentityService,
    privacy_preserving_login_subject,
    user_response,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def _enforce_rate_limit(
    action: str,
    subject: str,
    limit: int,
    settings: Settings,
) -> None:
    try:
        await AuthRateLimiter(settings).consume(action, subject, limit)
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts",
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc
    except RateLimitUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication protection is temporarily unavailable",
        ) from exc


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.refresh_token_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path=settings.auth_cookie_path,
    )


def _validate_cookie_origin(request: Request, settings: Settings) -> None:
    origin = request.headers.get("origin")
    if origin not in settings.cors_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin not allowed")


def _resolve_refresh_token(
    request: Request,
    body_token: str | None,
    settings: Settings,
) -> str:
    if body_token:
        return body_token
    cookie_token = request.cookies.get(settings.auth_cookie_name)
    if cookie_token:
        _validate_cookie_origin(request, settings)
        return cookie_token
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")


def _token_response(result: AuthResult, settings: Settings, include_refresh: bool) -> TokenResponse:
    return TokenResponse(
        access_token=result.access_token,
        expires_in=settings.access_token_minutes * 60,
        refresh_token=result.refresh_token if include_refresh else None,
        user=user_response(result.user),
    )


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RegistrationResponse:
    settings = get_settings()
    subject = privacy_preserving_login_subject(str(payload.email), _client_ip(request))
    await _enforce_rate_limit("register", subject, settings.register_rate_limit, settings)
    try:
        user = await IdentityService(session, settings).register(payload)
    except DuplicateEmailError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return RegistrationResponse(user=user_response(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    settings = get_settings()
    subject = privacy_preserving_login_subject(str(payload.email), _client_ip(request))
    await _enforce_rate_limit("login", subject, settings.login_rate_limit, settings)
    try:
        result = await IdentityService(session, settings).login(payload)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveAccountError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if payload.client_type == "web":
        _set_refresh_cookie(response, result.refresh_token, settings)
    return _token_response(result, settings, include_refresh=payload.client_type == "mobile")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    settings = get_settings()
    body_token = payload.refresh_token.get_secret_value() if payload.refresh_token else None
    token = _resolve_refresh_token(request, body_token, settings)
    await _enforce_rate_limit(
        "refresh",
        f"{_client_ip(request)}:{token}",
        settings.refresh_rate_limit,
        settings,
    )
    try:
        result = await IdentityService(session, settings).refresh(token)
    except InvalidRefreshTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveAccountError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if payload.client_type == "web":
        _set_refresh_cookie(response, result.refresh_token, settings)
    return _token_response(result, settings, include_refresh=payload.client_type == "mobile")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    settings = get_settings()
    body_token = payload.refresh_token.get_secret_value() if payload.refresh_token else None
    token = _resolve_refresh_token(request, body_token, settings)
    await IdentityService(session, settings).logout(token)
    response.delete_cookie(
        settings.auth_cookie_name,
        path=settings.auth_cookie_path,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )


@router.get("/me", response_model=UserResponse)
async def me(
    principal: Annotated[CurrentPrincipal, Depends(get_current_principal)],
) -> UserResponse:
    return user_response(principal.user)
