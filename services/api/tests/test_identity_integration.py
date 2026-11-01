"""Real PostgreSQL/Redis identity lifecycle and security integration tests."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession

from app.core.config import get_settings
from app.domain.models.governance import AuditLog
from app.domain.models.identity import RefreshSession, User, UserRole
from app.infrastructure.database import AsyncSessionFactory
from app.modules.identity.errors import DuplicateEmailError, InvalidRefreshTokenError
from app.modules.identity.schemas import LoginRequest, RegisterRequest
from app.modules.identity.security import hash_refresh_token
from app.modules.identity.service import AuthResult, IdentityService


def unique_email(prefix: str) -> str:
    return f"phase11-{prefix}-{uuid4().hex}@example.com"


def registration_payload(email: str) -> dict[str, str]:
    return {
        "email": email,
        "password": "StrongPassword9!",
        "display_name": "ADORA Test User",
    }


@pytest.mark.asyncio
async def test_registration_persists_argon2_and_traveler_role(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    email = unique_email("register")
    response = await api_client.post(
        "/api/v1/auth/register", json=registration_payload(email.upper())
    )

    assert response.status_code == 201
    assert response.json()["user"]["email"] == email
    assert response.json()["user"]["roles"] == ["traveler"]
    assert response.json()["user"]["email_verified"] is False
    assert "password" not in response.text

    result = await db_session.execute(select(User).where(User.email == email).options())
    user = result.scalar_one()
    assert user.password_hash.startswith("$argon2id$")
    roles = await db_session.scalars(select(UserRole.role).where(UserRole.user_id == user.id))
    assert roles.all() == ["traveler"]


@pytest.mark.asyncio
async def test_duplicate_invalid_weak_and_role_escalation_registration_rejected(
    api_client: httpx.AsyncClient,
) -> None:
    email = unique_email("validation")
    first = await api_client.post("/api/v1/auth/register", json=registration_payload(email))
    duplicate = await api_client.post("/api/v1/auth/register", json=registration_payload(email))
    invalid = await api_client.post(
        "/api/v1/auth/register",
        json={**registration_payload("not-an-email"), "email": "not-an-email"},
    )
    weak = await api_client.post(
        "/api/v1/auth/register",
        json={**registration_payload(unique_email("weak")), "password": "weakpassword"},
    )
    escalation = await api_client.post(
        "/api/v1/auth/register",
        json={**registration_payload(unique_email("admin")), "role": "admin"},
    )

    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert invalid.status_code == 422
    assert weak.status_code == 422
    assert "weakpassword" not in weak.text
    assert escalation.status_code == 422


@pytest.mark.asyncio
async def test_login_me_refresh_replay_and_logout_lifecycle(
    api_client: httpx.AsyncClient,
) -> None:
    email = unique_email("lifecycle")
    await api_client.post("/api/v1/auth/register", json=registration_payload(email))

    invalid = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword9!", "client_type": "mobile"},
    )
    unknown = await api_client.post(
        "/api/v1/auth/login",
        json={
            "email": unique_email("unknown"),
            "password": "WrongPassword9!",
            "client_type": "mobile",
        },
    )
    assert invalid.status_code == unknown.status_code == 401
    assert invalid.json()["error"]["message"] == unknown.json()["error"]["message"]

    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPassword9!", "client_type": "mobile"},
    )
    assert login.status_code == 200
    access_token = login.json()["access_token"]
    refresh_token = login.json()["refresh_token"]

    me = await api_client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert "password_hash" not in me.text

    rotated = await api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token, "client_type": "mobile"},
    )
    assert rotated.status_code == 200
    rotated_token = rotated.json()["refresh_token"]
    assert rotated_token != refresh_token

    replay = await api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token, "client_type": "mobile"},
    )
    assert replay.status_code == 401
    revoked_by_policy = await api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": rotated_token, "client_type": "mobile"},
    )
    assert revoked_by_policy.status_code == 401

    second_login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPassword9!", "client_type": "mobile"},
    )
    logout_token = second_login.json()["refresh_token"]
    logout = await api_client.post("/api/v1/auth/logout", json={"refresh_token": logout_token})
    assert logout.status_code == 204
    after_logout = await api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": logout_token, "client_type": "mobile"},
    )
    assert after_logout.status_code == 401


@pytest.mark.asyncio
async def test_web_refresh_cookie_is_http_only_and_origin_protected(
    api_client: httpx.AsyncClient,
) -> None:
    email = unique_email("cookie")
    await api_client.post("/api/v1/auth/register", json=registration_payload(email))
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPassword9!", "client_type": "web"},
    )

    assert login.status_code == 200
    assert login.json()["refresh_token"] is None
    cookie_header = login.headers["set-cookie"].lower()
    assert "httponly" in cookie_header
    assert "samesite=lax" in cookie_header

    blocked = await api_client.post("/api/v1/auth/refresh", json={"client_type": "web"})
    allowed = await api_client.post(
        "/api/v1/auth/refresh",
        json={"client_type": "web"},
        headers={"Origin": "http://localhost:3000"},
    )
    assert blocked.status_code == 403
    assert allowed.status_code == 200


@pytest.mark.asyncio
async def test_suspended_account_cannot_login_or_use_existing_access_token(
    api_client: httpx.AsyncClient,
    database_connection: AsyncConnection,
) -> None:
    email = unique_email("suspended")
    await api_client.post("/api/v1/auth/register", json=registration_payload(email))
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPassword9!", "client_type": "mobile"},
    )
    await database_connection.execute(
        update(User).where(User.email == email).values(status="suspended")
    )

    rejected_login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPassword9!", "client_type": "mobile"},
    )
    rejected_me = await api_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert rejected_login.status_code == 403
    assert rejected_me.status_code == 403


@pytest.mark.asyncio
async def test_expired_refresh_token_is_rejected(
    api_client: httpx.AsyncClient,
    database_connection: AsyncConnection,
) -> None:
    email = unique_email("expired-refresh")
    await api_client.post("/api/v1/auth/register", json=registration_payload(email))
    login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPassword9!", "client_type": "mobile"},
    )
    token = login.json()["refresh_token"]
    now = datetime.now(UTC)
    await database_connection.execute(
        update(RefreshSession)
        .where(RefreshSession.token_hash == hash_refresh_token(token))
        .values(created_at=now - timedelta(days=2), expires_at=now - timedelta(days=1))
    )

    response = await api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": token, "client_type": "mobile"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_anonymous_and_malformed_access_are_denied(api_client: httpx.AsyncClient) -> None:
    anonymous = await api_client.get("/api/v1/auth/me")
    malformed = await api_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
    )
    assert anonymous.status_code == malformed.status_code == 401


@pytest.mark.asyncio
async def test_login_rate_limit_uses_real_redis(api_client: httpx.AsyncClient) -> None:
    email = unique_email("rate-limit")
    responses = [
        await api_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPassword9!", "client_type": "mobile"},
        )
        for _ in range(get_settings().login_rate_limit + 1)
    ]
    assert all(response.status_code == 401 for response in responses[:-1])
    assert responses[-1].status_code == 429
    assert int(responses[-1].headers["retry-after"]) > 0


@pytest.mark.asyncio
async def test_concurrent_duplicate_registration_is_database_safe() -> None:
    email = unique_email("concurrent-register")
    payload = RegisterRequest(**registration_payload(email))

    async def attempt() -> User | BaseException:
        try:
            async with AsyncSessionFactory() as session:
                return await IdentityService(session, get_settings()).register(payload)
        except BaseException as exc:  # test captures the competing transaction outcome
            return exc

    results = await asyncio.gather(attempt(), attempt())
    try:
        assert sum(isinstance(result, User) for result in results) == 1
        assert sum(isinstance(result, DuplicateEmailError) for result in results) == 1
    finally:
        async with AsyncSessionFactory.begin() as cleanup:
            user_id = await cleanup.scalar(select(User.id).where(User.email == email))
            if user_id is not None:
                await cleanup.execute(delete(AuditLog).where(AuditLog.actor_user_id == user_id))
                await cleanup.execute(delete(User).where(User.id == user_id))


@pytest.mark.asyncio
async def test_concurrent_refresh_allows_one_rotation_and_detects_reuse() -> None:
    email = unique_email("concurrent-refresh")
    settings = get_settings()
    async with AsyncSessionFactory() as session:
        user = await IdentityService(session, settings).register(
            RegisterRequest(**registration_payload(email))
        )
    async with AsyncSessionFactory() as session:
        login = await IdentityService(session, settings).login(
            LoginRequest(
                email=email,
                password=SecretStr("StrongPassword9!"),
                client_type="mobile",
            )
        )

    async def rotate() -> AuthResult | BaseException:
        try:
            async with AsyncSessionFactory() as session:
                return await IdentityService(session, settings).refresh(login.refresh_token)
        except BaseException as exc:
            return exc

    outcomes = await asyncio.gather(rotate(), rotate())
    try:
        assert sum(isinstance(result, AuthResult) for result in outcomes) == 1
        assert sum(isinstance(result, InvalidRefreshTokenError) for result in outcomes) == 1
        winner = next(result for result in outcomes if isinstance(result, AuthResult))
        async with AsyncSessionFactory() as session:
            with pytest.raises(InvalidRefreshTokenError):
                await IdentityService(session, settings).refresh(winner.refresh_token)
    finally:
        async with AsyncSessionFactory.begin() as cleanup:
            await cleanup.execute(delete(AuditLog).where(AuditLog.actor_user_id == user.id))
            await cleanup.execute(delete(User).where(User.id == user.id))
