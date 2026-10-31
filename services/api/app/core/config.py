"""Environment-backed application configuration."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field
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
        default=(
            "postgresql+psycopg://adora:change_me_for_local_development@localhost:5432/adora"
        ),
        validation_alias=AliasChoices("DATABASE_URL", "ADORA_DATABASE_URL"),
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "ADORA_REDIS_URL"),
    )
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide immutable settings instance."""

    return Settings()
