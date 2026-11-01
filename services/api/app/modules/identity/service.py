"""Transactional identity use cases independent of FastAPI transport."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.domain.models.identity import RefreshSession, User, UserRole
from app.modules.identity.errors import (
    DuplicateEmailError,
    InactiveAccountError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)
from app.modules.identity.repository import IdentityRepository
from app.modules.identity.schemas import LoginRequest, RegisterRequest, UserResponse
from app.modules.identity.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    perform_dummy_password_check,
    verify_password,
)


@dataclass(frozen=True)
class AuthResult:
    access_token: str
    refresh_token: str
    user: User


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        status=user.status,
        roles=sorted(role.role for role in user.roles),
        email_verified=user.email_verified_at is not None,
    )


class IdentityService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.repository = IdentityRepository(session)

    async def register(self, request: RegisterRequest) -> User:
        user = User(
            email=str(request.email).lower(),
            password_hash=hash_password(request.password.get_secret_value()),
            display_name=request.display_name,
            status="active",
        )
        user.roles.append(UserRole(role="traveler"))
        try:
            async with self.session.begin():
                self.session.add(user)
                await self.session.flush()
                self.repository.add_audit_event(
                    "identity.user_registered",
                    actor_user_id=user.id,
                    entity_type="user",
                    entity_id=user.id,
                )
        except IntegrityError as exc:
            await self.session.rollback()
            raise DuplicateEmailError("An account with this email already exists") from exc
        return user

    async def login(self, request: LoginRequest) -> AuthResult:
        password = request.password.get_secret_value()
        async with self.session.begin():
            user = await self.repository.get_user_by_email(str(request.email).lower())
            password_valid = False
            if user is None:
                perform_dummy_password_check(password)
            else:
                password_valid = verify_password(password, user.password_hash)

        if user is None or not password_valid:
            await self._record_auth_rejection(
                "identity.login_failed",
                user.id if user else None,
                "invalid_credentials",
            )
            raise InvalidCredentialsError("Invalid email or password")
        if user.status != "active":
            await self._record_auth_rejection(
                "identity.login_rejected", user.id, "inactive_account"
            )
            raise InactiveAccountError("Account is not active")

        now = datetime.now(UTC)
        refresh_token = generate_refresh_token()
        async with self.session.begin():
            self.session.add(
                RefreshSession(
                    user_id=user.id,
                    token_hash=hash_refresh_token(refresh_token),
                    expires_at=now + timedelta(days=self.settings.refresh_token_days),
                )
            )
            self.repository.add_audit_event(
                "identity.login_succeeded",
                actor_user_id=user.id,
                entity_type="user",
                entity_id=user.id,
            )
        return AuthResult(
            access_token=create_access_token(user.id, self.settings, now),
            refresh_token=refresh_token,
            user=user,
        )

    async def refresh(self, raw_token: str) -> AuthResult:
        token_hash = hash_refresh_token(raw_token)
        now = datetime.now(UTC)
        error: InvalidRefreshTokenError | InactiveAccountError | None = None
        result: AuthResult | None = None
        async with self.session.begin():
            refresh_session = await self.repository.get_refresh_session_for_update(token_hash)
            if refresh_session is None:
                self.repository.add_audit_event(
                    "identity.refresh_rejected",
                    actor_user_id=None,
                    metadata={"reason": "invalid_token"},
                )
                error = InvalidRefreshTokenError("Invalid refresh token")
            elif refresh_session.revoked_at is not None:
                await self.repository.revoke_active_sessions(refresh_session.user_id, now)
                self.repository.add_audit_event(
                    "identity.refresh_reuse_detected",
                    actor_user_id=refresh_session.user_id,
                    entity_type="refresh_session",
                    entity_id=refresh_session.id,
                    metadata={"policy": "revoke_all_active_user_sessions"},
                )
                error = InvalidRefreshTokenError("Invalid refresh token")
            elif refresh_session.expires_at <= now:
                refresh_session.revoked_at = now
                self.repository.add_audit_event(
                    "identity.refresh_rejected",
                    actor_user_id=refresh_session.user_id,
                    entity_type="refresh_session",
                    entity_id=refresh_session.id,
                    metadata={"reason": "expired"},
                )
                error = InvalidRefreshTokenError("Invalid refresh token")
            elif refresh_session.user.status != "active":
                refresh_session.revoked_at = now
                self.repository.add_audit_event(
                    "identity.refresh_rejected",
                    actor_user_id=refresh_session.user_id,
                    entity_type="refresh_session",
                    entity_id=refresh_session.id,
                    metadata={"reason": "inactive_account"},
                )
                error = InactiveAccountError("Account is not active")
            else:
                refresh_session.revoked_at = now
                rotated_token = generate_refresh_token()
                self.session.add(
                    RefreshSession(
                        user_id=refresh_session.user_id,
                        token_hash=hash_refresh_token(rotated_token),
                        expires_at=now + timedelta(days=self.settings.refresh_token_days),
                    )
                )
                self.repository.add_audit_event(
                    "identity.refresh_rotated",
                    actor_user_id=refresh_session.user_id,
                    entity_type="refresh_session",
                    entity_id=refresh_session.id,
                )
                result = AuthResult(
                    access_token=create_access_token(refresh_session.user_id, self.settings, now),
                    refresh_token=rotated_token,
                    user=refresh_session.user,
                )
        if error is not None:
            raise error
        if result is None:
            raise InvalidRefreshTokenError("Invalid refresh token")
        return result

    async def logout(self, raw_token: str) -> None:
        token_hash = hash_refresh_token(raw_token)
        now = datetime.now(UTC)
        async with self.session.begin():
            refresh_session = await self.repository.get_refresh_session_for_update(token_hash)
            if refresh_session is None or refresh_session.revoked_at is not None:
                return
            refresh_session.revoked_at = now
            self.repository.add_audit_event(
                "identity.logout",
                actor_user_id=refresh_session.user_id,
                entity_type="refresh_session",
                entity_id=refresh_session.id,
            )

    async def _record_auth_rejection(self, action: str, user_id: UUID | None, reason: str) -> None:
        async with self.session.begin():
            self.repository.add_audit_event(
                action,
                actor_user_id=user_id,
                entity_type="user",
                entity_id=user_id,
                metadata={"reason": reason},
            )


def privacy_preserving_login_subject(email: str, client_ip: str) -> str:
    email_digest = hashlib.sha256(email.lower().encode("utf-8")).hexdigest()
    return f"{client_ip}:{email_digest}"
