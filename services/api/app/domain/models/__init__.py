"""Import every ORM mapping into one schema-qualified metadata registry."""

from app.domain.models.base import SCHEMA_NAME, Base
from app.domain.models.booking import (
    Booking,
    BookingItem,
    BookingQuote,
    BookingQuoteItem,
    InventoryHold,
)
from app.domain.models.catalog import Destination, Place, PlaceMedia, ServiceOffer
from app.domain.models.governance import AuditLog, IdempotencyRequest, OutboxEvent
from app.domain.models.identity import RefreshSession, User, UserRole
from app.domain.models.inventory import InventorySlot
from app.domain.models.itinerary import AIGenerationLog, Itinerary, ItineraryItem
from app.domain.models.partner import Partner, PartnerMembership
from app.domain.models.payment import PaymentAttempt, PaymentEvent, Voucher

__all__ = [
    "AIGenerationLog",
    "AuditLog",
    "Base",
    "Booking",
    "BookingItem",
    "BookingQuote",
    "BookingQuoteItem",
    "Destination",
    "IdempotencyRequest",
    "InventoryHold",
    "InventorySlot",
    "Itinerary",
    "ItineraryItem",
    "OutboxEvent",
    "Partner",
    "PartnerMembership",
    "PaymentAttempt",
    "PaymentEvent",
    "Place",
    "PlaceMedia",
    "RefreshSession",
    "SCHEMA_NAME",
    "ServiceOffer",
    "User",
    "UserRole",
    "Voucher",
]
