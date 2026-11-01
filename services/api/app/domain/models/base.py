"""Shared SQLAlchemy metadata for the authoritative ADORA schema."""

from typing import Any

from sqlalchemy import MetaData
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase

SCHEMA_NAME = "adora"


class Base(DeclarativeBase):
    """One coherent metadata registry for all 24 business tables."""

    metadata = MetaData(schema=SCHEMA_NAME)
    type_annotation_map = {dict[str, Any]: JSONB}
