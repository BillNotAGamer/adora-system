"""Environment-backed application configuration."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Validated settings with safe local-development defaults."""

    model_config = SettingsConfigDict(
        env_file=(REPOSITORY_ROOT / ".env", SERVICE_ROOT / ".env"),
        env_file_encoding="utf-8",
        env_prefix="ADORA_",
        extra="ignore",
    )

    app_name: str = "ADORA API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"
    database_url: str = Field(
        default=("postgresql+psycopg://adora:change_me_for_local_development@localhost:5432/adora"),
        validation_alias=AliasChoices("DATABASE_URL", "ADORA_DATABASE_URL"),
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "ADORA_REDIS_URL"),
    )
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]
    jwt_signing_key: SecretStr = Field(
        default=SecretStr("development-only-change-this-jwt-signing-key-2026"),
        validation_alias=AliasChoices("JWT_SIGNING_KEY", "ADORA_JWT_SIGNING_KEY"),
    )
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_issuer: str = "adora-api"
    jwt_audience: str = "adora-clients"
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    auth_cookie_name: str = "adora_refresh"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_path: str = "/api/v1/auth"
    login_rate_limit: int = Field(default=5, ge=1, le=100)
    register_rate_limit: int = Field(default=5, ge=1, le=100)
    refresh_rate_limit: int = Field(default=20, ge=1, le=200)
    auth_rate_window_seconds: int = Field(default=60, ge=10, le=3600)

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        secret = self.jwt_signing_key.get_secret_value()
        if self.environment in {"staging", "production"}:
            unsafe_markers = ("development", "change-this", "change_me")
            if len(secret) < 32 or any(marker in secret.lower() for marker in unsafe_markers):
                raise ValueError("A strong JWT_SIGNING_KEY is required outside local environments")
            if not self.auth_cookie_secure:
                raise ValueError("Secure refresh cookies are required outside local environments")
        if "*" in self.cors_origins:
            raise ValueError("Wildcard CORS origins are forbidden for credentialed requests")
        return self


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide immutable settings instance."""

    return Settings()
