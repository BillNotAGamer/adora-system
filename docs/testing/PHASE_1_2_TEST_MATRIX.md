# Phase 1.2 Test Matrix

The backend suite runs against real PostgreSQL 18/PostGIS 3.6 and uses rollback-safe outer
transactions. It does not truncate, reset, or reseed the development database.

| Area | Automated evidence |
|---|---|
| Destination | Admin create/update/list, duplicate slug, anonymous denial, hidden public exclusion |
| Place | Create/update/archive, coordinate validation, destination FK, duplicate slug, category/name filters |
| Media | Attach/list/reorder/detach, duplicate key conflict, stable ordering |
| Partner | Admin creation, membership assignment, self-escalation denial, owner update, staff denial |
| Offer | Owner create, active public visibility, private list, integer price, invalid FK/price rollback |
| Isolation | Cross-partner read/update denial, traveler denial, suspended-account denial, admin override foundation |
| Spatial | Inside/outside radius, invalid coordinates/radius/category/limit, distance/UUID order, GiST plan evidence |
| Seed | Twelve deterministic rows, additive first run, zero-create idempotent second run |
| Regression | Phase 1.1 registration/session/JWT/RBAC/ORM/schema checks remain in the full suite |

Final Phase 1.2 backend result at implementation time: `41 passed`. The original Phase 1.1 suite
contained 32 tests; Phase 1.2 adds nine integration tests.

Required full verification is `corepack pnpm@12.16.1 verify`, plus Expo dependency/Doctor checks,
OpenAPI regeneration, live HTTP checks, and the web `/ai-planner` render check documented in the
Phase 1.2 report.
