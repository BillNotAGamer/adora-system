# Adora — Database Schema Baseline v1.0

**Status:** Implementation baseline, awaiting execution and migration verification on PostgreSQL 18 / PostGIS 3.6.
**Architecture:** Modular Monolith; one DB, application modules own their business data.

## 1. Design decisions

- Schema namespace: `adora`; migrate through Alembic (SQL-first revision `0001_adora`).
- Primary key: `UUID DEFAULT gen_random_uuid()` for public identifiers; no predictable sequences exposed externally.
- Time: `TIMESTAMPTZ` UTC for instants; `DATE` for trip-local date. Local service time is represented as an absolute instant in inventory slots; display in the destination timezone.
- Money: `BIGINT` in VND, all prices in nonnegative integer units. No FX or floating point. Any later multi-currency support requires an ADR and explicit currency columns/conversion semantics.
- Database owns persisted facts, constraints and indexes; backend owns workflows, aggregate validations and RBAC.
- Avoid PostgreSQL ENUM for mutable workflow values: `TEXT CHECK` makes revisions less difficult (but still requires migrations).
- Preserve transactional rows; archive rather than hard-delete historical catalog entities.
- Use `JSONB` only for flexible AI/offer metadata, never as a substitute for normalized inventory, prices or payments.

## 2. Domains (24 tables)

| Domain | Tables |
|---|---|
| Identity | `users`, `user_roles`, `refresh_sessions` |
| Partner | `partners`, `partner_memberships` |
| Catalog | `destinations`, `places`, `place_media`, `service_offers` |
| Inventory | `inventory_slots` |
| Itinerary / AI | `itineraries`, `itinerary_items`, `ai_generation_logs` |
| Quote / Booking | `booking_quotes`, `booking_quote_items`, `bookings`, `booking_items`, `inventory_holds` |
| Payment / Voucher | `payment_attempts`, `payment_events`, `vouchers` |
| Governance | `idempotency_requests`, `audit_logs`, `outbox_events` |

## 3. Cardinality & lifecycle

- 1 destination → N places; 1 place → N offers; 1 partner → N offers.
- 1 offer → N inventory slots (availability for a defined time interval).
- 1 user → N itineraries; 1 itinerary → N itinerary items.
- 1 user → N quotes; 1 quote → N quote items; 1 quote → maximum 1 booking.
- 1 booking → N booking items; each booking item → 1 inventory hold; each booking item → 0..quantity vouchers.
- 1 booking → N payment attempts; at most 1 attempt in settled/refunding/refunded status.

### Specialized product semantics

- `stay`: an inventory slot is one **night** for a specific stay offer. Multiple nights require multiple booking items (one per night); grouping into a single UI line is an API concern. Check-in/check-out rules and availability for every night are validated by the API.
- `transport`: offer has `place_id` = departure node and `arrival_place_id` = arrival node; slot = a departure service (with end time).
- `experience`: one slot is one admission time/window.
- `place` is a geographic or travel POI, not an inventory unit; `service_offer` defines a bookable product; `inventory_slot` defines capacity for a time window.

## 4. Hard invariants and enforcement locations

| Invariant | Enforced by |
|---|---|
| No duplicate email (case-insensitive) | `uq_users_email_ci` unique index + application normalization |
| Partner can access only own inventory | Application membership query + authorization tests; DB membership relation |
| Nonnegative prices, sensible dates | CHECK constraints |
| `held_quantity + confirmed_quantity <= capacity` | CHECK on `inventory_slots` + transactional atomic updates |
| One unique time window per offer | UNIQUE on `(offer_id,start,end)` |
| Booking's quote belongs to same user | Composite foreign key `(quote_id,user_id)` |
| A quote cannot make two bookings | UNIQUE `bookings.quote_id` |
| One booking item per slot per booking | UNIQUE `(booking_id,inventory_slot_id)` |
| Booking item must reference a quote item from its booking’s quote and the same inventory slot | Composite FKs `(booking_id,quote_id)` and `(quote_item_id,quote_id,inventory_slot_id)` |
| Inventory hold references the same slot as its booking item | Composite FK `(booking_item_id,inventory_slot_id)` |
| At most one settled payment attempt per booking | Partial unique index |
| Payment events de-duplicated | UNIQUE `(gateway,event_fingerprint)` |
| QR token cannot be guessed from stored data | Only SHA-256 digest of high-entropy random token stored; verification in server |
| One voucher per unit index | UNIQUE `(booking_item_id, unit_index)` |
| Quote total = sum quote items; booking total = sum booking items | Transactional application service + tests (cross-row sum cannot be ordinary CHECK) |
| Voucher count <= booking item quantity; voucher only for confirmed booking | Transactional application service + tests |
| Itinerary item offer belongs to its place | Application domain validation + integration test |
| Slot immutable once quoted/booked | Application lifecycle policy + tests (upgrade to trigger if multiple writers emerge) |
| `updated_at` is current on mutations | ORM/service update policy; no auto-update trigger in this baseline |

**Important:** The database CHECK on counters prevents exceeding capacity, but those counters do not synchronize themselves with `inventory_holds`. Booking services MUST update both in a single transaction. Use integration tests to guard drift; add a reconciliation job. Do not treat this schema alone as sufficient to prevent overbooking.

## 5. Inventory transaction protocol

### Reserve (all slots within a single PostgreSQL transaction)

1. Validate quote owner, expiry and current prices; never trust client-sent price.
2. Lock requested `inventory_slots` in **deterministic UUID order**, using `SELECT ... FOR UPDATE`; avoid locking unrelated slots.
3. Validate all slots open, requested quantity available, and slot schedule valid.
4. Insert `bookings`, `booking_items`, `inventory_holds(status='active')`.
5. Increase `inventory_slots.held_quantity` atomically with `WHERE capacity - held_quantity - confirmed_quantity >= requested_qty`; require affected row count 1 for every slot.
6. If any slot fails, rollback **all** local writes.
7. Commit. Only then initiate an external payment request.

### Confirm payment

1. Verify VNPay checksum/signature, merchant transaction reference, amount, status; don't trust Return URL for business state.
2. Lock booking, payment attempt and inventory slots in stable order.
3. Deduplicate gateway event; record callback event without secrets.
4. If active hold still valid and booking can transition: decrement held; increment confirmed; set hold consumed and booking confirmed; create outbox event for voucher issuance. Commit.
5. If hold expired/released: keep financial success, set booking `reconciliation_required`, do **not** issue vouchers. Escalate refund/compensation.
6. Webhook retries must be idempotent; never double-increment counters.

### Expire / release

- Worker reads `inventory_holds WHERE status='active' AND expires_at <= now()`; transitions each hold only once within a transaction, decrementing counters, then updates booking status as appropriate. Do not depend solely on Redis TTL.
- If payment arrives after expiry, do not resurrect capacity already released.

## 6. Indexing/scalability

- GiST index on `places.location` enables nearby searches with `ST_DWithin(places.location, ST_SetSRID(ST_MakePoint(lon,lat),4326)::geography, radius_m)`.
- Partial indexes on active catalog, expiring holds, pending booking, outbox queue.
- Composite indexes on common lookups by user and timestamp, partner+status, offer+start time.
- Avoid indexing each foreign key or JSONB column without a query plan. Evaluate `EXPLAIN (ANALYZE, BUFFERS)` on realistic fixture data.
- Start with one DB; connection pooling and read replicas only after measurement. Partition events/logs by month **only** if volume and maintenance justify it.
- Expansion to external suppliers, multi-currency, physical hotel room allocations, complex airline itineraries requires new domain modules/migrations (not silently covered by this MVP).

## 7. Operational and security rules

- Keep DB credentials in environment/secrets; `.env.example` includes DEVELOPMENT-ONLY defaults.
- Use principle of least privilege for runtime user vs migrator user in deployed environments.
- The local Docker database is for development, not production or regulated financial data.
- No raw password, QR token, signing secret, access token, or complete unfiltered payment payload in logs.
- Backup + tested restore is prerequisite to destructive upgrades. No `DROP TABLE` downgrade for baseline.
- Never run baseline SQL by hand **and** Alembic on the same DB. Alembic is canonical.

## 8. Deferred decisions / change triggers

- PostGIS `geography` for short-radius search is sufficient for MVP; road travel times need a separate routing provider.
- Multiple currencies: add currency/exchange-rate snapshot design and monetary model ADR.
- More payment gateways: migrate gateway CHECK restrictions, adapter contracts and signature handling.
- Provider-hosted inventory: introduces reservations at the supplier boundary and Saga/compensations.
- Regional destination expansion: no schema rework required; import catalog and support destination timezone metadata if cross-timezone services appear.
