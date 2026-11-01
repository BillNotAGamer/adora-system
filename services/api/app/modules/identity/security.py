"""Password, access-token, and opaque refresh-token primitives."""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import Settings
from app.modules.identity.errors import InvalidAccessTokenError

password_hasher = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = (
    "$argon2id$v=19$m=65536,t=3,p=4$NzOEN4620UBp76ssQH7glg$"
    "yaURTgOVgj50Min1hHKGp1GjjD4CklyMj+8I9G0W/pM"
)


@dataclass(frozen=True)
class AccessClaims:
    subject: UUID
    token_id: UUID
    expires_at: datetime


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except (ValueError, TypeError):
        return False


def perform_dummy_password_check(password: str) -> None:
    verify_password(password, DUMMY_PASSWORD_HASH)


def create_access_token(user_id: UUID, settings: Settings, now: datetime | None = None) -> str:
    issued_at = now or datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.access_token_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": issued_at,
        "nbf": issued_at,
        "exp": expires_at,
        "jti": str(uuid4()),
    }
    return jwt.encode(
        payload,
        settings.jwt_signing_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str, settings: Settings) -> AccessClaims:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_signing_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={
                "require": ["sub", "iss", "aud", "iat", "nbf", "exp", "jti"],
            },
        )
        subject = UUID(payload["sub"])
        token_id = UUID(payload["jti"])
        expires_at = datetime.fromtimestamp(payload["exp"], UTC)
    except (InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise InvalidAccessTokenError("Invalid access token") from exc
    return AccessClaims(subject=subject, token_id=token_id, expires_at=expires_at)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
