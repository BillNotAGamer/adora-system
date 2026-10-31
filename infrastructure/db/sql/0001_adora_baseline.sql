-- ADORA Database Baseline v1.0
-- Target: PostgreSQL 18 + PostGIS 3.6; schema: adora
-- Versioned by services/api/alembic/versions/0001_adora_baseline.py
-- All lifecycle state transitions and counters require transactional application services.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS adora;
SET search_path TO adora, public;

-- IDENTITY
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1)
);
CREATE UNIQUE INDEX uq_users_email_ci ON users (lower(email));

CREATE TABLE user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('traveler', 'partner', 'admin')),
    granted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE refresh_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(token_hash) = 64),
    CHECK (expires_at > created_at)
);
CREATE INDEX ix_refresh_sessions_user_active ON refresh_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

-- PARTNER MANAGEMENT
CREATE TABLE partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name text NOT NULL,
    public_name text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE partner_memberships (
    partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membership_role text NOT NULL CHECK (membership_role IN ('owner', 'manager', 'staff')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(partner_id, user_id)
);
CREATE INDEX ix_partner_memberships_user ON partner_memberships(user_id, partner_id);

-- CATALOG: locations, offers and availability are independent concepts.
CREATE TABLE destinations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    country_code char(2) NOT NULL DEFAULT 'VN',
    center geography(Point, 4326),
    status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE places (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
    slug text NOT NULL,
    name text NOT NULL,
    category text NOT NULL CHECK (category IN ('attraction', 'hotel', 'restaurant', 'transport_hub', 'other')),
    location geography(Point, 4326) NOT NULL,
    description text,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(destination_id, slug)
);
CREATE INDEX ix_places_location_gist ON places USING gist(location);
CREATE INDEX ix_places_destination_category ON places(destination_id, category) WHERE status = 'active';

CREATE TABLE place_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id uuid NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
    media_key text NOT NULL,
    media_kind text NOT NULL CHECK(media_kind IN ('image', 'video')),
    sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(place_id, media_key)
);
CREATE INDEX ix_place_media_sort ON place_media(place_id, sort_order);

CREATE TABLE service_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    place_id uuid NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
    arrival_place_id uuid REFERENCES places(id) ON DELETE RESTRICT,
    title text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('stay', 'transport', 'experience')),
    description text,
    base_price_vnd bigint NOT NULL CHECK (base_price_vnd >= 0),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((kind = 'transport' AND arrival_place_id IS NOT NULL AND arrival_place_id <> place_id)
       OR (kind <> 'transport' AND arrival_place_id IS NULL))
);
CREATE INDEX ix_offers_partner_status ON service_offers(partner_id, status);
CREATE INDEX ix_offers_place_kind_active ON service_offers(place_id, kind) WHERE status = 'active';

CREATE TABLE inventory_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES service_offers(id) ON DELETE RESTRICT,
    service_start_at timestamptz NOT NULL,
    service_end_at timestamptz NOT NULL,
    capacity integer NOT NULL CHECK (capacity > 0),
    held_quantity integer NOT NULL DEFAULT 0 CHECK (held_quantity >= 0),
    confirmed_quantity integer NOT NULL DEFAULT 0 CHECK (confirmed_quantity >= 0),
    override_unit_price_vnd bigint CHECK (override_unit_price_vnd >= 0),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (service_end_at > service_start_at),
    CHECK (held_quantity + confirmed_quantity <= capacity),
    UNIQUE(offer_id, service_start_at, service_end_at)
);
CREATE INDEX ix_inventory_offer_date ON inventory_slots(offer_id, service_start_at) WHERE status = 'open';
CREATE INDEX ix_inventory_start_date ON inventory_slots(service_start_at);

-- ITINERARY & AI: AI output is only a proposal until validated by the API.
CREATE TABLE itineraries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
    title text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    budget_vnd bigint NOT NULL CHECK(budget_vnd >= 0),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
CREATE INDEX ix_itineraries_user_created ON itineraries(user_id, created_at DESC);

CREATE TABLE itinerary_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    place_id uuid NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
    offer_id uuid REFERENCES service_offers(id) ON DELETE RESTRICT,
    day_index integer NOT NULL CHECK(day_index >= 1),
    sort_order integer NOT NULL CHECK(sort_order >= 0),
    planned_start_at timestamptz,
    planned_end_at timestamptz,
    estimated_cost_vnd bigint NOT NULL DEFAULT 0 CHECK(estimated_cost_vnd >= 0),
    notes text,
    UNIQUE(itinerary_id, day_index, sort_order),
    CHECK (planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at > planned_start_at)
);
CREATE INDEX ix_itinerary_items_by_itinerary ON itinerary_items(itinerary_id, day_index, sort_order);

CREATE TABLE ai_generation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    itinerary_id uuid REFERENCES itineraries(id) ON DELETE SET NULL,
    model_id text NOT NULL,
    request_hash text NOT NULL,
    input_summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(input_summary) = 'object'),
    output_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(output_metadata) = 'object'),
    validation_status text NOT NULL CHECK(validation_status IN ('accepted', 'rejected', 'failed')),
    latency_ms integer CHECK(latency_ms >= 0),
    error_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(request_hash) = 64)
);
CREATE INDEX ix_ai_logs_user_created ON ai_generation_logs(user_id, created_at DESC);

-- QUOTES: price snapshots; re-validate inventory and quote expiry before creating holds.
CREATE TABLE booking_quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    itinerary_id uuid REFERENCES itineraries(id) ON DELETE SET NULL,
    total_vnd bigint NOT NULL CHECK (total_vnd >= 0),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK(expires_at > created_at),
    UNIQUE(id, user_id)
);
CREATE INDEX ix_quotes_user_created ON booking_quotes(user_id, created_at DESC);

CREATE TABLE booking_quote_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id uuid NOT NULL REFERENCES booking_quotes(id) ON DELETE RESTRICT,
    inventory_slot_id uuid NOT NULL REFERENCES inventory_slots(id) ON DELETE RESTRICT,
    offer_title_snapshot text NOT NULL,
    quantity integer NOT NULL CHECK(quantity > 0),
    unit_price_vnd bigint NOT NULL CHECK(unit_price_vnd >= 0),
    line_total_vnd bigint GENERATED ALWAYS AS (quantity::bigint * unit_price_vnd) STORED,
    UNIQUE(quote_id, inventory_slot_id),
    UNIQUE(id, quote_id, inventory_slot_id)
);
CREATE INDEX ix_quote_items_slot ON booking_quote_items(inventory_slot_id);

-- BOOKINGS: one quote may form at most one booking; ownership enforced by composite FK.
CREATE TABLE bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code text NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    quote_id uuid NOT NULL UNIQUE,
    total_vnd bigint NOT NULL CHECK(total_vnd >= 0),
    status text NOT NULL DEFAULT 'held' CHECK(status IN (
        'held', 'payment_pending', 'confirmed', 'payment_failed',
        'expired', 'reconciliation_required', 'cancelled', 'refunded'
    )),
    hold_expires_at timestamptz NOT NULL,
    confirmed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_bookings_quote_owner FOREIGN KEY (quote_id, user_id)
       REFERENCES booking_quotes(id, user_id) ON DELETE RESTRICT,
    UNIQUE(id, quote_id)
);
CREATE INDEX ix_bookings_user_created ON bookings(user_id, created_at DESC);
CREATE INDEX ix_bookings_status_expiry ON bookings(status, hold_expires_at)
    WHERE status IN ('held','payment_pending');

CREATE TABLE booking_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    quote_item_id uuid NOT NULL UNIQUE,
    inventory_slot_id uuid NOT NULL REFERENCES inventory_slots(id) ON DELETE RESTRICT,
    offer_title_snapshot text NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price_vnd bigint NOT NULL CHECK(unit_price_vnd >= 0),
    line_total_vnd bigint GENERATED ALWAYS AS (quantity::bigint * unit_price_vnd) STORED,
    CONSTRAINT fk_booking_item_booking_quote FOREIGN KEY (booking_id, quote_id)
       REFERENCES bookings(id, quote_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_item_quote_slot FOREIGN KEY (quote_item_id, quote_id, inventory_slot_id)
       REFERENCES booking_quote_items(id, quote_id, inventory_slot_id) ON DELETE RESTRICT,
    UNIQUE(booking_id, inventory_slot_id),
    UNIQUE(id, inventory_slot_id)
);
CREATE INDEX ix_booking_items_slot ON booking_items(inventory_slot_id);

CREATE TABLE inventory_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_item_id uuid NOT NULL UNIQUE,
    inventory_slot_id uuid NOT NULL,
    quantity integer NOT NULL CHECK(quantity > 0),
    status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'consumed', 'released', 'expired')),
    expires_at timestamptz NOT NULL,
    released_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_hold_booking_item_slot FOREIGN KEY (booking_item_id, inventory_slot_id)
       REFERENCES booking_items(id, inventory_slot_id) ON DELETE RESTRICT,
    CHECK(expires_at > created_at)
);
CREATE INDEX ix_holds_expiring ON inventory_holds(expires_at) WHERE status = 'active';
CREATE INDEX ix_holds_slot_active ON inventory_holds(inventory_slot_id) WHERE status = 'active';

-- PAYMENT: payment result and booked inventory are separate facts.
CREATE TABLE payment_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    gateway text NOT NULL CHECK(gateway IN ('vnpay')),
    gateway_reference text NOT NULL,
    gateway_transaction_id text,
    expected_amount_vnd bigint NOT NULL CHECK(expected_amount_vnd >= 0),
    status text NOT NULL DEFAULT 'pending' CHECK(status IN (
        'pending','succeeded','failed','refund_pending','refunded'
    )),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(gateway, gateway_reference)
);
CREATE INDEX ix_payment_attempts_booking ON payment_attempts(booking_id, created_at DESC);
CREATE UNIQUE INDEX uq_one_settled_payment_per_booking ON payment_attempts(booking_id)
    WHERE status IN ('succeeded', 'refund_pending', 'refunded');
CREATE UNIQUE INDEX uq_gateway_transaction ON payment_attempts(gateway, gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL;

CREATE TABLE payment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id uuid REFERENCES payment_attempts(id) ON DELETE SET NULL,
    gateway text NOT NULL CHECK(gateway IN ('vnpay')),
    event_fingerprint text NOT NULL,
    checksum_verified boolean NOT NULL DEFAULT false,
    amount_vnd bigint CHECK(amount_vnd >= 0),
    event_status text NOT NULL CHECK(event_status IN ('received', 'processed', 'ignored', 'rejected')),
    sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(sanitized_payload) = 'object'),
    received_at timestamptz NOT NULL DEFAULT now(),
    CHECK(length(event_fingerprint) = 64),
    UNIQUE(gateway, event_fingerprint)
);
CREATE INDEX ix_payment_events_attempt_received ON payment_events(payment_attempt_id, received_at DESC);

CREATE TABLE vouchers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_item_id uuid NOT NULL REFERENCES booking_items(id) ON DELETE RESTRICT,
    unit_index integer NOT NULL CHECK(unit_index > 0),
    token_hash text NOT NULL UNIQUE CHECK(length(token_hash) = 64),
    status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'redeemed', 'void')),
    issued_at timestamptz NOT NULL DEFAULT now(),
    redeemed_at timestamptz,
    UNIQUE(booking_item_id, unit_index),
    CHECK(status <> 'redeemed' OR redeemed_at IS NOT NULL)
);
CREATE INDEX ix_vouchers_booking_item ON vouchers(booking_item_id);

-- GOVERNANCE / SAFETY
CREATE TABLE idempotency_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL CHECK(length(request_hash) = 64),
    response_metadata jsonb CHECK(response_metadata IS NULL OR jsonb_typeof(response_metadata) = 'object'),
    status text NOT NULL DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(user_id, operation, idempotency_key)
);

CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata) = 'object'),
    occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entity_time ON audit_logs(entity_type, entity_id, occurred_at DESC);
CREATE INDEX ix_audit_actor_time ON audit_logs(actor_user_id, occurred_at DESC);

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_name text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_outbox_pending ON outbox_events(available_at, id)
    WHERE status IN ('pending', 'failed');
CREATE INDEX ix_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id, created_at DESC);
