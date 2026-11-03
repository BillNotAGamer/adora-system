# ADORA Phase 1.2 — Catalog, Partner, Geospatial, and AI Interface Report

**Date:** 2026-11-01 (Asia/Bangkok)
**Outcome:** COMPLETE
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`

## 1. Executive summary

Phase 1.2 closes the reviewed Phase 1.1 work in Git, then adds database-backed destination, place,
media-metadata, partner, membership, service-offer, and nearby-place APIs. The implementation follows
the immutable 24-table PostgreSQL/PostGIS baseline and requires no schema migration. It also adds an
explicit, additive Da Lat demo seed and a responsive, static `/ai-planner` Next.js interface preview.

All ten acceptance gates pass. The final API suite contains 41 passing tests (32 retained from Phase
1.1 plus nine Phase 1.2 integration tests). The monorepo lint, strict typing, builds, Alembic check,
schema audit, original database smoke test, frozen pnpm install, Expo compatibility, Expo Doctor,
OpenAPI client generation, live PostGIS API flow, and desktop/mobile page rendering pass.

No Gemini call, chatbot backend, conversation persistence, booking, inventory mutation, payment, or
voucher behavior was introduced.

## 2. Initial and final Git status

At entry, `main` pointed to the Phase 1.0 baseline
`9840067929e78957a5e0e9b2d03026325376ecf6` and the complete Phase 1.1 implementation was an
uncommitted 55-file change. The Phase 1.1 diff was reviewed, full verification passed, ignored paths
were confirmed, a high-confidence secret scan found no matches, and the staged whitespace check was
cleaned before commit.

Phase 1.1 closure commit:

```text
116a378f0d08970eb5c73aab879a95afa0e4afd0
feat: implement adora phase 1.1 orm and identity foundation
```

Final HEAD remains `116a378f0d08970eb5c73aab879a95afa0e4afd0`. Phase 1.2 is intentionally an
uncommitted, reviewable working-tree change. No remote push, force operation, nested repository, or
global Git setting change occurred.

## 3. Phase 1.1 closure evidence

Before the commit, `pnpm verify` passed web/mobile lint and builds, client build, Ruff, mypy, all 32
tests, Alembic zero-drift comparison, the 24-table/198-column metadata audit, and the original
PostGIS smoke test. Staged paths excluded `.env`, `.venv`, dependency trees, caches, and build output.
No private-key, cloud-key, GitHub-token, Slack-token, or OpenAI-style secret pattern was found.

## 4. Repository changes

Major additions and updates:

- `services/api/app/modules/catalog/`: DTOs, queries, transactional services, routes, errors, and
  deterministic demo seed data.
- `services/api/app/modules/partner/`: organization and membership administration plus scoped offer
  operations.
- `services/api/app/modules/geospatial/`: bounded `ST_DWithin`/`ST_Distance` nearby search.
- `services/api/tests/{catalog_helpers,test_catalog_integration,test_partner_catalog,
  test_geospatial_seed}.py`: real PostgreSQL/PostGIS integration coverage.
- `services/api/scripts/seed_demo_catalog.py`: explicit development/test-only seed command.
- `apps/web/src/app/ai-planner/page.tsx`: static responsive AI interface preview.
- Landing-page and shared-navigation links to `/ai-planner`.
- Updated API composition, authorization read transaction boundaries, generated OpenAPI client,
  root demo-seed command, repository guidance, documentation, and this report.
- Visual evidence under `docs/reports/assets/`.

No dependency or framework version was upgraded and `pnpm-lock.yaml` did not change in Phase 1.2.

## 5. Database and schema decisions

The ORM and canonical schema were treated as authoritative. Domain decisions follow existing fields:

- destinations: `active` / `hidden`;
- places: `active` / `hidden` / `archived`;
- partners: `pending` / `approved` / `suspended`;
- membership roles: `owner` / `manager` / `staff`;
- offers: `draft` / `active` / `paused` / `archived`;
- offer kinds: `stay` / `transport` / `experience`;
- catalog money: integer VND;
- geography: `geography(Point,4326)` in longitude/latitude order.

The schema has no partner ownership key on `places` or `place_media`, so their mutations are
administrator-only. Partner ownership begins at `service_offers.partner_id`. No competing ownership
model or migration was invented.

## 6. Destination and place implementation

Public destination and place reads expose active records only. Administrator routes create, update,
hide, and archive records using DTO validation and explicit transactions. Place queries support
destination/category filters and escaped case-insensitive name matching. Latitude, longitude,
category, status, slug, foreign-key, and duplicate constraints are verified.

Media operations attach, order, update, list, and detach metadata. They do not upload or delete an
external asset. Public media is reachable only through an active place.

## 7. Partner management implementation

Administrator routes create/list/read/update partners and assign/remove memberships. Assignment
adds the existing global `partner` role when absent, but authorization still requires the matching
composite membership. Removal keeps the role because a user may have memberships elsewhere; the role
alone grants no organization access.

Partners can view their memberships. Owners/managers can update non-status organization fields and
mutate offers. Staff is read-only. Partner-controlled status changes are rejected. Suspended users,
travelers, anonymous users, and cross-partner requests are denied. Administrator scope override is
tested explicitly.

## 8. Service offer implementation

Public routes return active definitions only. Partner-private routes include draft/paused/archived
records for the owning organization. Create/update validates integer non-negative prices, place
references, transport arrival rules, approved-partner publication policy, and immutable partner
ownership. Invalid foreign-key creation is rolled back without a partial offer or audit event.

These endpoints define catalog services and prices only. They do not inspect or mutate dated
inventory and do not create reservations.

## 9. PostGIS search implementation

`GET /api/v1/places/nearby` constructs a WGS84 point in longitude/latitude order, filters active
places with `ST_DWithin`, computes meter distances with `ST_Distance`, and orders by distance then
UUID. Optional destination/category filters run in SQL. Radius is bounded to 50 km and result count
to 100.

Tests cover inside/outside radius, zero-distance ties, stable UUID order, invalid coordinates,
radius, category and limit, public destination filtering, and real PostGIS results. An `EXPLAIN`
check with sequential scans disabled confirms `ix_places_location_gist` is eligible for the radius
predicate. This is plan/index evidence, not a latency benchmark. Returned distance is explicitly
described as straight-line geodesic distance, not driving distance.

## 10. Demo seed strategy and live result

The seed uses deterministic UUIDv5 identifiers, natural-key collision refusal, ORM mappings, and one
transaction. It runs only in `development`/`test`, requires `--confirm`, never deletes data, never
creates credentials, and marks place/offer flexible attributes as demonstration data.

Real development database evidence:

```text
first run:  created=12, existing=0
second run: created=0, existing=12
live API:   1 destination, 4 nearby places, 3 active offers
```

The 12 requested demo rows remain in the local development database. They are clearly labeled and
contain example-only prices and `demo://` media references.

## 11. Implemented API endpoints

Public:

```text
GET /api/v1/destinations
GET /api/v1/destinations/{destination_id}
GET /api/v1/places
GET /api/v1/places/nearby
GET /api/v1/places/{place_id}
GET /api/v1/places/{place_id}/media
GET /api/v1/offers
GET /api/v1/offers/{offer_id}
```

Administrator:

```text
GET|POST /api/v1/admin/destinations
PATCH    /api/v1/admin/destinations/{destination_id}
GET|POST /api/v1/admin/places
PATCH    /api/v1/admin/places/{place_id}
POST     /api/v1/admin/places/{place_id}/media
PATCH|DELETE /api/v1/admin/place-media/{media_id}
GET|POST /api/v1/admin/partners
GET|PATCH /api/v1/admin/partners/{partner_id}
PUT|DELETE /api/v1/admin/partners/{partner_id}/members/{user_id}
```

Partner-scoped:

```text
GET   /api/v1/partners/me
PATCH /api/v1/partners/{partner_id}
GET|POST /api/v1/partners/{partner_id}/offers
PATCH /api/v1/partners/{partner_id}/offers/{offer_id}
```

## 12. Authorization and security findings

Routes reuse Phase 1.1 JWT validation and reload current status, roles, and memberships from
PostgreSQL. During testing, protected mutations exposed an implicit SQLAlchemy transaction opened by
authorization reads. The dependencies now wrap and close those read-only transactions before an
application service starts its explicit mutation unit of work. The complete Phase 1.1 regression
suite verifies this did not weaken identity behavior.

User-supplied partner/user/role values never bypass server-side checks. Query inputs are bound through
SQLAlchemy; name search escapes wildcard characters. No credentials, tokens, personal seed data, or
AI/provider keys were added or logged.

## 13. AI chatbot skeleton

`/ai-planner` is a static Server Component with a desktop sidebar, header, welcome text, suggestion
cards, placeholder history/profile areas, and disabled prompt/send controls. It explicitly states
that AI is not connected and that no message will be sent. Mobile hides the sidebar and retains a
readable single-column conversation layout.

The React review found no client hooks, shared mutable state, waterfalls, broad imports, persistence,
or unnecessary library. A source scan found no `useChat`, generation/streaming call, Gemini API call,
or chatbot backend route.

## 14. Visual verification evidence

- Desktop 1440×1000: [phase-1-2-ai-planner-desktop.png](assets/phase-1-2-ai-planner-desktop.png)
- Mobile emulated 390×844: [phase-1-2-ai-planner-mobile.png](assets/phase-1-2-ai-planner-mobile.png)

Headless Chrome DevTools emulation reported:

```json
{"innerWidth":390,"scrollWidth":390,"bodyScrollWidth":390}
```

An initial Windows CLI screenshot used Chrome's minimum layout width and exposed clipping in the
cropped image. The page was strengthened with explicit flex width/overflow constraints, then a true
device-metrics capture confirmed no horizontal overflow.

## 15. OpenAPI and generated client

FastAPI exports 28 paths. `pnpm api:generate` regenerated
`packages/api-client/src/schema.d.ts`; client strict typecheck and build pass. Backend DTOs remain the
only hand-authored API contract. The chatbot page does not consume catalog APIs in this phase.

## 16. Automated tests

Final backend result:

```text
41 passed
32 Phase 1.1 regression tests
9 Phase 1.2 catalog/partner/PostGIS/seed integration tests
```

Tests use real PostgreSQL/PostGIS and rollback-safe fixtures. Redis-dependent Phase 1.1 rate-limit
tests also pass. No test truncates, resets, or destructively reseeds the database.

## 17. Full regression results

| Check | Result |
|---|---|
| Frozen pnpm install / lock policy | PASS |
| ESLint (web/mobile) and Ruff | PASS |
| TypeScript (web/mobile/client) and mypy (55 API files) | PASS |
| Next.js production build | PASS; `/ai-planner` statically prerendered |
| Expo SDK 58 web export | PASS |
| Expo dependency compatibility | PASS; up to date |
| Expo Doctor | PASS; 20/20 |
| API client generation/typecheck/build | PASS |
| Pytest | PASS; 41 tests |
| Alembic check | PASS; no new operations |
| Schema audit | PASS; 24 tables, 198 columns, revision `0001_adora` |
| Original DB smoke test | PASS |
| PostgreSQL/PostGIS and Redis Compose health | PASS |
| Live planner HTTP/render | PASS; HTTP 200 plus desktop/mobile captures |
| Live current-code API | PASS on port 8012; 28 paths and real seeded catalog responses |

Canonical SHA-256 values remain:

```text
SQL:       B28D2C1877DC88ADEF6B04C1E424EF324308897CA5A1ABA1B92C6254A7F56FE9
Migration: 6DD49C8B2F6D8D6ED0EFF2F5ACBB71DE80135CA181482DA3145D8AFBBFFC22B3
```

## 18. Commands and notable outcomes

Final successful commands include:

```powershell
corepack pnpm@12.16.1 install --frozen-lockfile
corepack pnpm@12.16.1 verify
corepack pnpm@12.16.1 api:generate
corepack pnpm@12.16.1 --filter @adora/api-client typecheck
corepack pnpm@12.16.1 --filter @adora/api-client build
corepack pnpm@12.16.1 --filter @adora/mobile exec expo install --check
corepack pnpm@12.16.1 --filter @adora/mobile run doctor
services\api\.venv\Scripts\python.exe services/api/scripts/seed_demo_catalog.py --confirm
docker compose config --quiet
docker compose ps
```

Defects found and repaired during verification:

- Authorization reads left implicit transactions open before protected mutations; dependencies now
  finish read transactions explicitly.
- The standalone seed selected Windows Proactor; it now uses the existing psycopg-compatible
  selector loop factory.
- Initial mobile capture was not a true 390px layout viewport; DevTools emulation provided valid
  width evidence and prompted stronger overflow containment.
- Sandbox denied the pnpm user store lock and Expo metadata network; the same pinned/scoped commands
  passed with approved host access.

## 19. Remaining issues, limitations, and deferred functionality

- A pre-existing process on port 8000 still serves the old seven-path Phase 1.1 API. It was not
  terminated because it was not started by this implementation. Restart the normal API process to
  load Phase 1.2. Verification used the current code on isolated port 8012 and then stopped it.
- Offset pagination returns page count, not total count, and can shift during concurrent writes.
- Places/media have no partner ownership in the baseline; administrator-only mutation remains the
  honest safe policy until a reviewed schema change exists.
- Media asset upload/transformation, richer moderation, road routing, full-text search, production
  catalog imports, mobile catalog features, Gemini, conversation state, AI planning, inventory,
  booking, payment, and voucher workflows remain deferred.

## 20. Acceptance gates and Phase 1.3 readiness

| Gate | Status | Evidence |
|---|---|---|
| A — Phase 1.1 Git checkpoint | **PASS** | Reviewed/verified closure commit `116a378` |
| B — Catalog CRUD/validation | **PASS** | Real PostgreSQL API integration tests |
| C — Partner authorization | **PASS** | Membership tiers, escalation and cross-partner denial |
| D — Service offers | **PASS** | Ownership, visibility, price/FK and rollback tests |
| E — PostGIS search | **PASS** | Real radius results, validation, stable order and GiST plan |
| F — Safe demo seed | **PASS** | Live `12 created` then `0 created / 12 existing` |
| G — Chatbot skeleton | **PASS** | Build, HTTP 200, desktop/mobile screenshots, zero overflow |
| H — OpenAPI client | **PASS** | 28 paths; generated client typecheck/build |
| I — Phase 1.1 regression | **PASS** | Identity, RBAC, ORM and security tests retained |
| J — Monorepo quality | **PASS** | Frozen install, lint, typing, builds, Expo and DB checks |

Phase 1.2 is ready for Phase 1.3 after review and an explicitly authorized Phase 1.2 commit. Restart
the stale default API process first. Do not infer that deferred AI, inventory, booking, or payment
features are present.
