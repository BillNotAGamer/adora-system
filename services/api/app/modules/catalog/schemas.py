"""Validated request and response contracts for the travel catalog."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Slug = Annotated[str, Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
Name = Annotated[str, Field(min_length=1, max_length=200)]
Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]
PlaceCategory = Literal["attraction", "hotel", "restaurant", "transport_hub", "other"]
PlaceStatus = Literal["active", "hidden", "archived"]
DestinationStatus = Literal["active", "hidden"]
OfferKind = Literal["stay", "transport", "experience"]
OfferStatus = Literal["draft", "active", "paused", "archived"]
MediaKind = Literal["image", "video"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DestinationCreate(StrictModel):
    slug: Slug
    name: Name
    country_code: Annotated[str, Field(min_length=2, max_length=2)] = "VN"
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    status: DestinationStatus = "hidden"

    @field_validator("country_code")
    @classmethod
    def uppercase_country_code(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def coordinates_are_paired(self) -> DestinationCreate:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be supplied together")
        return self


class DestinationUpdate(StrictModel):
    slug: Slug | None = None
    name: Name | None = None
    country_code: Annotated[str, Field(min_length=2, max_length=2)] | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    status: DestinationStatus | None = None

    @field_validator("country_code")
    @classmethod
    def uppercase_country_code(cls, value: str | None) -> str | None:
        return value.upper() if value else None

    @model_validator(mode="after")
    def valid_patch(self) -> DestinationUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        if ("latitude" in self.model_fields_set) != ("longitude" in self.model_fields_set):
            raise ValueError("latitude and longitude must be supplied together")
        if self.latitude is None and "latitude" in self.model_fields_set:
            raise ValueError("destination center cannot be cleared by this API")
        return self


class DestinationResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    country_code: str
    latitude: float | None
    longitude: float | None
    status: str
    created_at: datetime


class DestinationListResponse(BaseModel):
    items: list[DestinationResponse]
    count: int
    limit: int
    offset: int


class PlaceCreate(StrictModel):
    destination_id: UUID
    slug: Slug
    name: Name
    category: PlaceCategory
    latitude: Latitude
    longitude: Longitude
    description: Annotated[str, Field(max_length=10_000)] | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    status: PlaceStatus = "hidden"


class PlaceUpdate(StrictModel):
    destination_id: UUID | None = None
    slug: Slug | None = None
    name: Name | None = None
    category: PlaceCategory | None = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    description: Annotated[str, Field(max_length=10_000)] | None = None
    attributes: dict[str, Any] | None = None
    status: PlaceStatus | None = None

    @model_validator(mode="after")
    def valid_patch(self) -> PlaceUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        if ("latitude" in self.model_fields_set) != ("longitude" in self.model_fields_set):
            raise ValueError("latitude and longitude must be supplied together")
        return self


class PlaceResponse(BaseModel):
    id: UUID
    destination_id: UUID
    slug: str
    name: str
    category: str
    latitude: float
    longitude: float
    description: str | None
    attributes: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class PlaceListResponse(BaseModel):
    items: list[PlaceResponse]
    count: int
    limit: int
    offset: int


class PlaceMediaCreate(StrictModel):
    media_key: Annotated[str, Field(min_length=1, max_length=500)]
    media_kind: MediaKind
    sort_order: Annotated[int, Field(ge=0)] = 0


class PlaceMediaUpdate(StrictModel):
    media_key: Annotated[str, Field(min_length=1, max_length=500)] | None = None
    media_kind: MediaKind | None = None
    sort_order: Annotated[int, Field(ge=0)] | None = None

    @model_validator(mode="after")
    def has_changes(self) -> PlaceMediaUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        return self


class PlaceMediaResponse(BaseModel):
    id: UUID
    place_id: UUID
    media_key: str
    media_kind: str
    sort_order: int
    created_at: datetime


class OfferCreate(StrictModel):
    place_id: UUID
    arrival_place_id: UUID | None = None
    title: Name
    kind: OfferKind
    description: Annotated[str, Field(max_length=10_000)] | None = None
    base_price_vnd: Annotated[int, Field(ge=0)]
    attributes: dict[str, Any] = Field(default_factory=dict)
    status: OfferStatus = "draft"

    @model_validator(mode="after")
    def validate_route_shape(self) -> OfferCreate:
        if self.kind == "transport":
            if self.arrival_place_id is None:
                raise ValueError("transport offers require arrival_place_id")
            if self.arrival_place_id == self.place_id:
                raise ValueError("transport origin and arrival places must differ")
        elif self.arrival_place_id is not None:
            raise ValueError("arrival_place_id is only valid for transport offers")
        return self


class OfferUpdate(StrictModel):
    place_id: UUID | None = None
    arrival_place_id: UUID | None = None
    title: Name | None = None
    kind: OfferKind | None = None
    description: Annotated[str, Field(max_length=10_000)] | None = None
    base_price_vnd: Annotated[int, Field(ge=0)] | None = None
    attributes: dict[str, Any] | None = None
    status: OfferStatus | None = None

    @model_validator(mode="after")
    def has_changes(self) -> OfferUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        return self


class OfferResponse(BaseModel):
    id: UUID
    partner_id: UUID
    place_id: UUID
    arrival_place_id: UUID | None
    title: str
    kind: str
    description: str | None
    base_price_vnd: int
    attributes: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class OfferListResponse(BaseModel):
    items: list[OfferResponse]
    count: int
    limit: int
    offset: int
