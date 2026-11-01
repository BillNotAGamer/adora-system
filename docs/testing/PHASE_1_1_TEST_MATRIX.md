# Phase 1.1 test matrix

Tests use real PostgreSQL/PostGIS and Redis. Ordinary API tests run inside an outer PostgreSQL
transaction and roll it back. The two concurrency tests use unique committed fixtures and delete
only their own audit/user rows in `finally`; no unknown data is truncated or reset.

| Area | Coverage |
|---|---|
| ORM | 24 tables, 198 columns, composite keys, PostGIS, computed fields, insert/query/relationship |
| Drift | live reflection, nullability/types/defaults, indexes, revision, Alembic check |
| Transactions | rollback sentinel and database email-normalization constraint |
| Registration | success, normalization, Argon2, traveler role, duplicate, concurrent duplicate, validation, escalation |
| Login | valid, wrong password, unknown user, suspended account, generic response, rate limit |
| JWT | valid, expiry, signature, issuer, audience, required claims, database status reload |
| Refresh | expiry, rotation, replay, concurrent race, conservative revocation, logout revocation |
| Authorization | anonymous denial, traveler/partner/admin, multi-role, cross-partner denial |
| Transport | HttpOnly cookie, SameSite, Origin enforcement, mobile token response, no secret echo |
| Resilience | Redis-backed limit and fail-closed Redis-unavailable policy |

Primary commands:

```powershell
services\api\.venv\Scripts\python.exe -m pytest services/api/tests
services\api\.venv\Scripts\python.exe -m ruff check services/api/app services/api/tests services/api/scripts
services\api\.venv\Scripts\python.exe -m mypy services/api/app
services\api\.venv\Scripts\python.exe -m alembic -c services/api/alembic.ini check
services\api\.venv\Scripts\python.exe services/api/scripts/audit_schema.py
services\api\.venv\Scripts\python.exe tests/db/smoke_test.py
corepack pnpm@12.16.1 verify
```

Android/iOS native runtime behavior still requires an emulator/device; Windows checks cover Expo
dependency consistency, lint, strict TypeScript, Doctor, and supported export only.
