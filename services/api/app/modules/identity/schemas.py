"""Pydantic request and response contracts for identity APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterRequest(StrictRequest):
    email: EmailStr
    password: SecretStr = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if not normalized:
            raise ValueError("Display name cannot be blank")
        return normalized

    @field_validator("password")
    @classmethod
    def enforce_password_policy(cls, value: SecretStr) -> SecretStr:
        password = value.get_secret_value()
        required = (
            any(character.islower() for character in password),
            any(character.isupper() for character in password),
            any(character.isdigit() for character in password),
            any(not character.isalnum() for character in password),
        )
        if not all(required):
            raise ValueError(
                "Password must include lowercase, uppercase, number, and symbol characters"
            )
        return value


class LoginRequest(StrictRequest):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)
    client_type: Literal["web", "mobile"] = "web"

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class RefreshRequest(StrictRequest):
    refresh_token: SecretStr | None = None
    client_type: Literal["web", "mobile"] = "web"


class LogoutRequest(StrictRequest):
    refresh_token: SecretStr | None = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str
    status: str
    roles: list[str]
    email_verified: bool


class RegistrationResponse(BaseModel):
    user: UserResponse


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    refresh_token: str | None = None
    user: UserResponse


class AuthorizationScope(BaseModel):
    user_id: UUID
    roles: frozenset[str]
    partner_id: UUID | None = None
    membership_role: str | None = None
    access_token_expires_at: datetime | None = None
