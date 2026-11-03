"""Partner management request and response contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

PartnerStatus = Literal["pending", "approved", "suspended"]
MembershipRole = Literal["owner", "manager", "staff"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PartnerCreate(StrictModel):
    legal_name: Annotated[str, Field(min_length=1, max_length=250)]
    public_name: Annotated[str, Field(min_length=1, max_length=200)]
    status: PartnerStatus = "pending"


class PartnerUpdate(StrictModel):
    legal_name: Annotated[str, Field(min_length=1, max_length=250)] | None = None
    public_name: Annotated[str, Field(min_length=1, max_length=200)] | None = None
    status: PartnerStatus | None = None

    @model_validator(mode="after")
    def has_changes(self) -> PartnerUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        return self


class PartnerSelfUpdate(StrictModel):
    legal_name: Annotated[str, Field(min_length=1, max_length=250)] | None = None
    public_name: Annotated[str, Field(min_length=1, max_length=200)] | None = None

    @model_validator(mode="after")
    def has_changes(self) -> PartnerSelfUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        return self


class PartnerResponse(BaseModel):
    id: UUID
    legal_name: str
    public_name: str
    status: str
    created_at: datetime
    updated_at: datetime


class PartnerListResponse(BaseModel):
    items: list[PartnerResponse]
    count: int
    limit: int
    offset: int


class MembershipAssignment(StrictModel):
    membership_role: MembershipRole


class MembershipResponse(BaseModel):
    partner_id: UUID
    user_id: UUID
    membership_role: str
    created_at: datetime
    partner: PartnerResponse | None = None


class MyPartnersResponse(BaseModel):
    memberships: list[MembershipResponse]
