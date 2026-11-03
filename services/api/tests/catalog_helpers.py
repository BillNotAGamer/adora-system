"""Shared builders for catalog integration tests."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.domain.models.identity import User, UserRole
from app.modules.identity.security import create_access_token, hash_password


async def create_test_user(
    session: AsyncSession,
    *roles: str,
    status: str = "active",
) -> tuple[User, dict[str, str]]:
    user = User(
        email=f"phase12-{uuid4().hex}@example.com",
        password_hash=hash_password("CatalogTestPassword9!"),
        display_name="Phase 1.2 Test User",
        status=status,
    )
    user.roles.extend(UserRole(role=role) for role in roles)
    async with session.begin():
        session.add(user)
        await session.flush()
    token = create_access_token(user.id, get_settings())
    return user, {"Authorization": f"Bearer {token}"}


def destination_payload(*, slug: str | None = None, status: str = "active") -> dict[str, object]:
    return {
        "slug": slug or f"phase12-destination-{uuid4().hex}",
        "name": "Phase 1.2 Test Destination",
        "country_code": "VN",
        "latitude": 11.9404,
        "longitude": 108.4583,
        "status": status,
    }


def place_payload(destination_id: str, *, slug: str | None = None) -> dict[str, object]:
    return {
        "destination_id": destination_id,
        "slug": slug or f"phase12-place-{uuid4().hex}",
        "name": "Phase 1.2 Test Place",
        "category": "attraction",
        "latitude": 11.941,
        "longitude": 108.459,
        "description": "Rollback-safe integration fixture",
        "attributes": {"phase": "1.2"},
        "status": "active",
    }
