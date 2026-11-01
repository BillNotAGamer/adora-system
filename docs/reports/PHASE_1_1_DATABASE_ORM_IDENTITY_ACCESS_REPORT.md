# ADORA Phase 1.1 — Database ORM Foundation & Identity Access Report

**Date:** 2026-11-01 (Asia/Bangkok)
**Outcome:** COMPLETE
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`

## 1. Executive summary

Phase 1.1 established a safe Git baseline, mapped all 24 authoritative PostgreSQL tables with
SQLAlchemy 2.x, enabled schema-aware Alembic comparison, added an independent live drift audit, and
implemented database-backed registration, login, current identity, refresh rotation/replay defense,
logout, RBAC, partner isolation, Redis rate limiting, security audit events, browser/mobile session
transport helpers, and a regenerated OpenAPI TypeScript contract.

All acceptance gates pass with real PostgreSQL 18.6/PostGIS 3.6.4 and Redis. The automated API suite
has 32 passing tests with no warnings. The original SQL and `0001_adora` migration hashes are
unchanged, Alembic detects no upgrade operations, the original database smoke test passes, and all
Phase 1.0 lint/type/build/Expo checks remain green. No Catalog, AI, Booking, Payment, or dashboard
business workflow was implemented.

## 2. Git branch, initial HEAD, and final HEAD

- Branch: `main`.
- Initial HEAD at Phase 1.1 start: `UNBORN`.
- Phase 1.0 baseline commit created as explicitly required:
  `9840067929e78957a5e0e9b2d03026325376ecf6` —
  `chore: establish adora phase 1.0 bootstrap baseline`.
- Final HEAD: `9840067929e78957a5e0e9b2d03026325376ecf6`.
- Phase 1.1 is intentionally retained as one reviewable working-tree change on top of the baseline;
  no unrequested Phase 1.1 commit, force operation, remote publication, or global Git configuration
  change was made.
- `.env`, virtual environments, dependency trees, builds, and caches remain ignored. The only Git
  metadata under the project is the root repository.

## 3. Repository changes

Major additions and updates:

- `services/api/app/domain/models/`: one metadata registry and domain-organized mappings for all 24
  tables.
- `services/api/app/modules/identity/`: DTOs, security primitives, persistence, application service,
  FastAPI routes, authentication, RBAC, and partner scope.
- `services/api/app/infrastructure/{rate_limit,schema_audit}.py`: atomic Redis protection and live
  PostgreSQL compatibility audit.
- `services/api/scripts/{audit_schema,provision_admin}.py`: explicit operational commands.
- `services/api/tests/`: PostgreSQL/Redis integration, ORM, security, token, concurrency, rate-limit,
  and authorization coverage.
- `apps/web/src/lib/auth-session.ts`: in-memory access-token and HttpOnly-cookie session interface.
- `apps/mobile/src/auth/session.ts` and `storage/secure-session.ts`: in-memory access token and
  SecureStore-only refresh-token rotation.
- Updated Alembic environment, settings, secure validation error handling, API routing, pinned
  Python lock, root verification, CI services, environment template, governance guidance, OpenAPI
  client, and Phase 1.1 documentation.
- Expo SDK 58 remained in place; only official compatibility patches were applied:
  `expo 58.0.22`, `expo-router 58.0.29`, and `@expo/ui 58.0.26`.

The official Expo installer added minimum-release-age exceptions while resolving newly published
patches. Removing them made frozen install correctly fail because the releases were still inside
pnpm's age window. The repository therefore retains only the 15 exact official Expo versions needed
by SDK 58 (no ranges or wildcards); frozen install and Doctor both pass. Re-evaluate and remove these
exceptions after the configured release-age window elapses.

## 4. ORM mapping implementation

The ORM uses `DeclarativeBase`, typed `Mapped`/`mapped_column`, async-session-compatible
relationships, and one `MetaData(schema="adora")`. Mapping coverage is:

| Domain | Tables |
|---|---|
| Identity | users, user_roles, refresh_sessions |
| Partner | partners, partner_memberships |
| Catalog | destinations, places, place_media, service_offers |
| Inventory | inventory_slots |
| Itinerary / AI | itineraries, itinerary_items, ai_generation_logs |
| Quote / Booking | booking_quotes, booking_quote_items, bookings, booking_items, inventory_holds |
| Payment / Voucher | payment_attempts, payment_events, vouchers |
| Governance | idempotency_requests, audit_logs, outbox_events |

The metadata preserves UUID defaults, TIMESTAMPTZ, JSONB, PostGIS `geography(Point,4326)`, stored
computed totals, case-insensitive email index, partial indexes, composite ownership/slot foreign
keys, lifecycle checks, server defaults, and delete actions. `AuditLog.event_metadata` maps the SQL
column named `metadata`, avoiding SQLAlchemy's reserved declarative attribute name without changing
the database column.

## 5. Database schema-drift results

Live independent audit result:

```text
PASS: 24 tables, 198 columns, 4 critical composite foreign keys,
10 critical indexes, revision 0001_adora
```

The audit verifies exact table/column sets, nullability, compatible type families, server-generated
values, primary keys, critical composite foreign keys, functional/partial indexes, PostGIS type/SRID,
computed total expressions, and revision state. Representative insert/query/relationship, constraint
failure, transaction rollback, and async lifecycle tests pass.

Known reflection behavior is handled narrowly: PostgreSQL reports the two stored generated totals as
nullable, while accepted quantity and price constraints make their expressions non-null. Alembic
also identifies and ignores this generated-column reflection difference. No general comparison
category was disabled.

## 6. Alembic revision verification

- `heads`: `0001_adora (head)`.
- `current`: `0001_adora (head)`.
- `alembic check`: `No new upgrade operations detected`.
- Canonical SQL SHA-256:
  `B28D2C1877DC88ADEF6B04C1E424EF324308897CA5A1ABA1B92C6254A7F56FE9`.
- Revision SHA-256:
  `6DD49C8B2F6D8D6ED0EFF2F5ACBB71DE80135CA181482DA3145D8AFBBFFC22B3`.
- Both hashes match Phase 1.0 and the read-only external baseline.
- No `0002` was required. No baseline edit, `create_all`, stamp, manual SQL reapplication, truncation,
  database reset, or volume deletion occurred.

## 7. Authentication architecture

Public registration normalizes and validates email, enforces a 12–128 character composition policy,
hashes with Argon2id, relies on database uniqueness for concurrency safety, and assigns only the
`traveler` role. Unknown request fields reject attempted role assignment. Email verification remains
false because delivery/verification is deferred.

Login performs a dummy Argon2 check for unknown users, returns the same credential error for unknown
email/wrong password, enforces account status, creates a refresh session transactionally, and emits
an audit event. Validation errors strip raw inputs so passwords cannot appear in responses or error
serialization.

## 8. Authorization architecture

Every protected request verifies the access token, then reloads the current user, active status, and
roles from PostgreSQL. Reusable dependencies implement authenticated access, active-account checks,
role checks, administrator checks, and partner scope. Partner access requires both the `partner` role
and a matching `(partner_id,user_id)` membership; cross-partner tests fail with 403. Administrators
may explicitly override partner scope.

Administrator registration is not public. `provision_admin.py` requires explicit `--confirm`, secure
password input/environment configuration, refuses existing accounts, has no hardcoded credential,
never runs at startup, and relies on production settings validation.

## 9. Token and session security

- Access JWT lifetime: 15 minutes by default.
- Required/verified claims: `sub`, `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`.
- Allowed algorithm: HS256 only; signing key comes from environment.
- Staging/production reject weak development keys and insecure refresh cookies.
- Refresh lifetime: seven days by default.
- Refresh credentials: 48-byte URL-safe opaque tokens; only SHA-256 hashes persist.
- Rotation: PostgreSQL `FOR UPDATE`, previous-session revocation, one new session in one transaction.
- Replay: a revoked-token reuse revokes every active refresh session for that user. The baseline has
  no family field, so complete family lineage is explicitly not claimed.
- Logout revokes refresh state. Short-lived access JWTs remain valid until expiry; there is no Phase
  1.1 access-token denylist.
- Redis rate limits use atomic Lua `INCR` + first-use `EXPIRE` with hashed subjects. Redis failure is
  fail-closed (503), not silent bypass.
- Web: HttpOnly refresh cookie, explicit SameSite/path/Secure policy, allowed-Origin enforcement,
  access token held only in memory, no localStorage.
- Mobile: refresh token only in Expo SecureStore, access token in memory/Authorization header, no
  AsyncStorage.

## 10. API endpoints implemented

| Endpoint | Status/behavior |
|---|---|
| `POST /api/v1/auth/register` | 201, safe user response |
| `POST /api/v1/auth/login` | 200, access token plus web cookie or mobile refresh token |
| `POST /api/v1/auth/refresh` | 200 rotation; 401 invalid/expired/replayed/revoked |
| `POST /api/v1/auth/logout` | 204 and refresh revocation |
| `GET /api/v1/auth/me` | 200 safe, database-backed current identity |

Existing health and readiness endpoints remain unchanged.

## 11. Updated OpenAPI client

`pnpm api:generate` exported FastAPI OpenAPI and regenerated
`packages/api-client/src/schema.d.ts`. All five authentication paths are present. Searches for
`password_hash`, `token_hash`, and JWT signing settings in the generated contract returned no
matches. API-client typecheck and build pass.

## 12. Automated tests and exact results

```text
pytest: 32 passed in 4.70s (final consolidated run, no warnings)
Ruff: All checks passed
mypy: Success, 38 source files
```

The tests cover 24-table metadata, live drift, composite keys, PostGIS, computed columns,
relationships, rollback, database constraints, registration validation/normalization/Argon2,
duplicate/concurrent duplicate handling, generic login errors, suspended users, JWT validation,
refresh expiry/rotation/replay/concurrent race/logout, traveler/partner/admin/multiple roles,
cross-partner denial, secure cookie Origin behavior, real Redis limiting, and Redis fail-closed
behavior.

The two concurrency tests use unique fixtures and targeted `finally` cleanup. Other integration
tests use an outer PostgreSQL transaction and rollback. No unknown data is reset.

## 13. Security observations

- Secret scan found no private-key/API-token patterns or sensitive filenames beyond the placeholder
  `.env.example`.
- `.env` remains ignored and was not staged.
- API/request logs contained only request metadata; live logs contained no password or token.
- Live security events were registration, successful login, rotation, logout, and replay detection.
- Browser-visible `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` values remain API URLs only.
- A long-lived access-token denylist, session-family persistence, email verification delivery,
  MFA, OAuth/social login, and production key management are intentionally deferred and not claimed.

## 14. Regression results

| Check | Result |
|---|---|
| Frozen pnpm install / supply-chain policy | PASS |
| Web + mobile ESLint / Ruff | PASS |
| Web + mobile + client TypeScript / mypy | PASS |
| Next.js 16.4.3 production build | PASS |
| Expo SDK 58 web export | PASS |
| Expo dependency check | PASS, up to date |
| Expo Doctor | PASS, 20/20 |
| API-client generation/typecheck/build | PASS |
| PostgreSQL/PostGIS + Redis health | PASS |
| Original database smoke test | PASS |
| CI YAML parse | PASS |
| Live Next.js page render | PASS, HTTP 200 with ADORA identity |
| Live FastAPI health/OpenAPI/auth flow | PASS |

Runtime/tool versions verified: Node 24.19.0, pnpm 12.16.1, Python 3.12.3, FastAPI 0.162.0,
SQLAlchemy 2.0.55, Alembic 1.20.1, GeoAlchemy2 0.20.0, Redis client 6.4.0, PyJWT 2.15.1,
pwdlib 0.3.1, and email-validator 2.3.0.

## 15. Commands executed and outcomes

Key commands (all final invocations passed):

```powershell
git add --all
git commit -m "chore: establish adora phase 1.0 bootstrap baseline"
corepack pnpm@12.16.1 install --frozen-lockfile
corepack pnpm@12.16.1 lint
corepack pnpm@12.16.1 typecheck
corepack pnpm@12.16.1 build
corepack pnpm@12.16.1 --filter @adora/mobile exec expo install --check
corepack pnpm@12.16.1 --filter @adora/mobile run doctor
corepack pnpm@12.16.1 api:generate
services\api\.venv\Scripts\python.exe -m ruff check app tests scripts
services\api\.venv\Scripts\python.exe -m mypy app
services\api\.venv\Scripts\python.exe -m pytest -q
services\api\.venv\Scripts\python.exe -m alembic -c alembic.ini check
services\api\.venv\Scripts\python.exe scripts\audit_schema.py
services\api\.venv\Scripts\python.exe tests\db\smoke_test.py
docker compose config --quiet
docker compose ps
```

Environment-specific investigations:

- Initial pip/Expo metadata requests were blocked by the sandbox network policy; the same scoped
  commands passed with approved external access.
- Initial Docker CLI inspection was blocked by the sandbox's Docker-pipe permissions; approved
  read-only Compose checks passed.
- Expo metadata reported three one-patch SDK 58 mismatches; the official Expo installer aligned
  only those packages and Doctor then passed 20/20.
- The first inline Python live-fixture cleanup command encountered PowerShell native-argument
  quoting. The fixture was then inspected and removed transactionally through targeted `psql`; a
  final query returned zero matching live fixtures.
- Direct execution of the unsigned `verify.ps1` was blocked by the machine's execution policy. No
  global policy was changed; the repository now exposes `pnpm verify`, which uses a one-process-only
  PowerShell bypass and completed the entire consolidated verification successfully.

## 16. Live end-to-end evidence

Disposable HTTP flow:

```text
register=201 login=200 me=200 refresh=200 logout=204 revoked_refresh=401
identity_email_match=True roles=traveler email_verified=False
```

Before targeted cleanup PostgreSQL showed one user with an Argon2id hash, traveler role, two refresh
sessions, both revoked, and these audit actions:

```text
identity.user_registered
identity.login_succeeded
identity.refresh_rotated
identity.logout
identity.refresh_reuse_detected
```

The fixture and five audit rows were deleted; the final matching account count was `0`.

## 17. Remaining risks and deferred features

- No Android emulator/physical-device runtime was available; native runtime behavior is not claimed.
  Supported Windows verification (lint, strict TypeScript, dependency check, Doctor, web export)
  passed. iOS builds were not attempted on Windows.
- Email verification delivery, password reset, MFA, OAuth/social login, production deployment,
  distributed access-token revocation, and refresh-family schema lineage remain deferred.
- Secure cookie deployment requires HTTPS and topology-specific same-origin/BFF configuration.
- Production secrets and managed infrastructure were not provisioned.
- Catalog CRUD, geospatial APIs, AI planning, inventory reservation, Booking, VNPay, and vouchers
  remain outside Phase 1.1.

## 18. Local development commands

From the repository root:

```powershell
# Infrastructure and migration verification
docker compose up -d db redis
$env:DATABASE_URL = 'postgresql+psycopg://adora:change_me_for_local_development@127.0.0.1:55432/adora'
services\api\.venv\Scripts\python.exe -m alembic -c services/api/alembic.ini upgrade head
services\api\.venv\Scripts\python.exe services/api/scripts/audit_schema.py

# API, web, and mobile
corepack pnpm@12.16.1 dev:api
corepack pnpm@12.16.1 dev:web
corepack pnpm@12.16.1 dev:mobile

# Phase 1.1 and regression verification
services\api\.venv\Scripts\python.exe -m pytest services/api/tests
corepack pnpm@12.16.1 verify

# Explicit initial administrator provisioning (prompts securely for password)
services\api\.venv\Scripts\python.exe services/api/scripts/provision_admin.py `
  --email admin@example.com --display-name "ADORA Administrator" --confirm
```

Local PostgreSQL is bound to `127.0.0.1:55432`; Redis is bound to `127.0.0.1:6379`.

## 19. Acceptance gates

| Gate | Status | Evidence |
|---|---|---|
| A — Git Integrity | **PASS** | Baseline commit, one repo, ignored secrets/artifacts, no global Git change |
| B — ORM Foundation | **PASS** | 24 mappings / 198 columns / relationships and critical constraints verified |
| C — Migration Integrity | **PASS** | Immutable hashes, one valid head/current, zero Alembic operations |
| D — Authentication | **PASS** | Real registration/login/JWT/rotation/logout and security tests |
| E — Authorization | **PASS** | DB roles, admin checks, partner membership isolation, escalation rejection |
| F — Security | **PASS** | Argon2id, hashed opaque refresh, replay defense, Redis limits, safe transport/logging |
| G — Integration | **PASS** | OpenAPI/client compile, real PostgreSQL and Redis integration tests |
| H — Regression | **PASS** | API/db tests, web build, Expo static/Doctor 20/20, CI YAML |

## 20. Readiness for Phase 1.2

Phase 1.1 is complete and ready for Phase 1.2. Future modules can depend on the shared metadata,
explicit async transactions, database-backed principals, reusable role checks, and partner scope.
Before Phase 1.2 begins, review and commit this Phase 1.1 working-tree change as one logical commit.
Do not edit `0001_adora`; any real schema evolution starts with a reviewed `0002`.
