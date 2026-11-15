# Product Phase 1A — Integration Foundation

Date: 2026-11-15 (Asia/Bangkok).

## Starting state and authorized scope

Branch `main`, starting HEAD `046ae849550caa82c44272a5aed1307c7757953b`. This committed post-H3 homepage change was preserved. H3 is `3365ea33f340577779967d72e158172c1fad8d6c`; H2 remains separately committed. Origin is `https://github.com/BillNotAGamer/adora-system.git`. One active worktree; no tracked changes at entry. The only untracked file was protected `docs/reports/assets/web-design-0-4.zip`.

This checkpoint implements CI command separation, current homepage runtime validation and coherent editorial fallback, focused tests, and the proposed Phase 1B contract. It does not implement persistent destination pages, migrations, AI, authentication UI, itineraries or business workflows.

## Homepage rendering investigation

The post-H3 commit adds `await connection()` inside `CatalogStories`, below the existing Suspense boundary. Its recorded intent is to opt the Catalog stream into dynamic rendering. The installed Next.js 16.4.3 documentation confirms that connection() waits for an incoming request and excludes subsequent work from prerendering. This does not independently remove fetch caching: each current request still specifies `next.revalidate: 300`, so cached successful public responses may be reused for up to that policy's lifetime. A request-time component is not a promise of a fresh upstream fetch per visitor.

The build continues to produce a partially prerendered homepage and 20 routes overall. Hero/philosophy and the editorial Suspense fallback remain renderable while Catalog work settles. Requests remain parallel through Promise.allSettled and individually bounded at 1800ms. HTTP/JSON/schema/timeout failure cannot reject the entire Catalog boundary; one valid half is retained as partial. There is no new waterfall or Client Component.

**Decision: retain connection().** It is consistent with the committed intent to defer this optional integration boundary to request time. It is not required for the purely editorial story itself and carries an optional request-time network cost; Phase 1A deliberately does not generalize this into rendering optimization. Its presence does not disable the existing fetch cache, authenticate a user, or establish persistent Catalog integration. The prior defect was unsafe data parsing/mixed editorial content, not the mere difference from H3.

## Implemented boundary correction

`apps/web/src/lib/catalog-contract.ts` uses existing Zod (no dependency/version change). Its narrow parsers cover the existing generated DestinationListResponse and OfferListResponse shapes, required fields, UUIDs, ISO timestamps, bounded coordinates, safe nonnegative integer money, JSON attributes, page-count consistency, bounded pagination and active-only public records. Unknown properties are stripped. The schemas are type-checked against generated item DTOs rather than inventing Phase 1B DTOs.

`catalog.ts` parses `unknown` JSON instead of asserting a generic Promise type. A fetch argument allows isolated tests; production defaults to the native/Next fetch. The 1800ms AbortSignal and five-minute revalidation remain unchanged. No raw upstream body, internal error or Zod error is displayed/logged by this boundary. A malformed/hidden/inactive collection invalidates that request; a valid other endpoint remains partial.

Current operational DTOs lack complete editorial content. The two homepage stories therefore retain the full original editorial unit: name, imagery, copy and experience labels. Arbitrary destination names and offer titles are no longer combined with fixed Đà Lạt/coffee photographs. Valid transport uses an honest editorial/unlinked label; offline transport retains the verified editorial/offline label. `source: live` describes two validated endpoint responses, not live editorial content, inventory or availability. Valid empty pages remain empty transport results while the explicitly editorial homepage story stays coherent.

Only two Server Component data selections/provenance labels changed. The React checklist confirmed no new hooks, state, hydration boundary or duplicated layout. Motion wrappers, timing, classes, CSS, hero, planner and itinerary behavior are unchanged. This review influenced retention of the server-rendered parallel-fetch/Suspense structure rather than adding client fetching.

## CI findings and repair

The Ubuntu JavaScript job previously ran root `pnpm lint` and `pnpm typecheck`, which chain into `.\\services\\api\\.venv\\Scripts\\python.exe`. That interpreter path is Windows-specific and the job does not prepare Python. A separate API job already installs Python and runs backend checks.

The JavaScript job now calls `pnpm lint:js`, `pnpm typecheck:js`, the existing web unit-test command, and the unchanged workspace build/mobile Doctor. Backend checks remain in the explicit Python job; Ruff now also covers scripts, preserving equivalent scope to the root backend lint task. Premature `setup-node cache: pnpm` was removed so setup does not need pnpm before `corepack enable`. No new action/tool dependency or dependency version was introduced.

The API client is explicitly built after installation and before JS typechecks: its exports point to ignored `dist` declarations, so a fresh checkout must emit them before the web package resolves generated types. This avoids relying on developer-local build artifacts. Workflow YAML parses with the already installed js-yaml package; the attempted lookup of a separate `yaml` package found none, and no parser dependency was installed.

Verification uncovered another real CI issue: root-level mypy invocation had not loaded the backend's strict pyproject configuration. From `services/api`, strict mypy reported six errors arising from two unannotated coordinate helpers. Both helpers now return `tuple[ColumnElement[float], ColumnElement[float]]`. This is an annotation/import-only Catalog repository correction, with no SQL or behavior change. Strict mypy now passes from the same working directory used by CI.

Hosted GitHub Actions was not triggered or claimed passing. Root Windows developer scripts remain supported locally; the workflow now separates JS and Python execution environments. Local results do not prove service-container or runner availability on GitHub.

## Backend and API-client readiness

- FastAPI import/application construction succeeded without connecting to PostgreSQL. New ASGI health/OpenAPI tests validate real application registration without a live server or database.
- Current destinations, offers, UUID detail and places paths are registered. Actual Pydantic empty-page models and response-schema references were checked.
- Database code still uses create_async_engine, pool_pre_ping, expire_on_commit=False, and per-request AsyncSession lifecycle. No engine/session settings or credentials changed.
- Static ORM tests verify all 24 mapped tables, critical composite keys, PostGIS and computed-column metadata. They do not prove live schema equality.
- `alembic heads` and `alembic history` report one chain: `<base> -> 0001_adora (head)`.
- Live database readiness is **DEFERRED**: configured loopback PostgreSQL port 55432 and Redis port 6379 timed out in bounded probes, including the network-enabled shell. No unknown/external database was contacted, migrated or seeded. Live Alembic check/schema audit, Catalog integration tests, PostGIS connectivity and Redis-backed integration remain unverified.
- `export_openapi.py` generated the actual app schema without database access. Existing openapi-typescript regeneration produced no content diff in `schema.d.ts`; API-client typecheck/build pass. Its runtime wrapper remains health-only; Catalog generated types already exist. New public editorial/slug methods belong to Phase 1B after backend implementation.

## Test and verification results

| Command / check | Result |
|---|---|
| Web test | PASS — 34 tests / 6 suites, zero failed/skipped; 22 existing + 12 new boundary tests |
| Web ESLint | PASS |
| Web TypeScript | PASS |
| Web production build | PASS — Next.js 16.4.3, 20 routes, homepage partially prerendered |
| Web 0.3 verifier | PASS — complete run, exit 0 |
| Homepage verifier | PASS — complete run, exit 0 |
| Web 0.4 verifier | PASS — complete final run, exit 0; Packages A/B/C/D/E and H1 assertions preserved |
| Ruff app/tests/scripts | PASS |
| Strict mypy from services/api | PASS — 55 application files, after annotation-only correction |
| Selected database-independent pytest | PASS — final 15/15 in 2.27s after the annotation fix; zero failed/skipped |
| Alembic heads/history | PASS — static revision chain only |
| OpenAPI export/regeneration | PASS — no generated-type content changes |
| API-client typecheck/build | PASS |
| Live PostgreSQL/PostGIS/Redis and Catalog persistence | DEFERRED — configured development dependencies unavailable |
| Hosted CI | NOT EXECUTED |

New boundary tests cover valid current DTOs, required fields, type/UUID/date errors, pagination, hidden/draft records, malformed offers, negative money, partial failure in both directions, invalid JSON, offline requests, real AbortSignal timeout, empty pages, and inconsistent destination/offer-to-editorial mapping. Successful-response fixtures are mocked transport tests, **not an online-backend result**. Historical offline browser-verifier behavior was preserved; live persistence is not claimed.

Backend selection (from services/api): `tests/test_security_primitives.py`, `tests/test_rate_limit.py`, `tests/test_catalog_contract_static.py`, plus the three static ORM nodes `test_all_24_tables_are_mapped`, `test_critical_composite_keys_are_mapped`, `test_postgis_and_computed_columns_are_mapped`. Existing database-dependent tests were not misrepresented as passing.

Browser commands ran against production `127.0.0.1:3100`, FastAPI offline. `ADORA_VERIFY_OUTPUT` and complete logs point to `F:/Coding/Adora System Mega Project/adora-phase1a-scratch-20261115/`. No tracked historical screenshot was regenerated. After the final pagination refinement, all 34 unit tests, lint, TypeScript and build passed again, followed by complete final reruns of all three browser verifiers (`final-web03.log`, `final-homepage.log`, `final-web04.log`) against that rebuilt code. The dedicated verification server was then stopped.

## Phase 1B contract and prerequisites

See `docs/architecture/ADORA_PRODUCT_PHASE_1_CATALOG_CONTRACT.md`. Recommended small hybrid: retain operational destination identity/geography and add one related editorial row only after owner approval and a reviewed additive migration. Proposed enriched public list/by-slug endpoints are additive; existing UUID APIs remain unchanged. Editorial Experience taxonomy is distinct from place categories and offer kinds; no Experience model was implemented.

The document specifies DTOs, unique-slug lookup, active-plus-published visibility, complete image/copy units, image URL/metadata boundaries, migration invariants, source-mode transition, offline semantics, runtime validation, client generation/versioning, tests/security, backward compatibility and a concrete Phase 1B file inventory. Its JSON is illustrative proposed contract, not an implemented API response.

Owner decisions remain: hybrid model/migration approval; region and publication taxonomy; vi-VN scope; stable slugs; authoritative-live versus explicit demo-mode behavior; content/image ownership and media delivery; controlled database/migration authority. Related experiences can stay fixtures or empty references for the first slice. No persistent journey should be declared complete before real database and browser list → detail verification.

## Git closure

Authorized checkpoint subject: `feat(integration): establish adora catalog contract foundation`. Selective staging includes only workflow separation, annotation-only strict-CI correction, Catalog validation and coherent fallback, focused tests and these two documents. Generated types need no staged change. The final full SHA is supplied in the handoff (a commit cannot include its own immutable SHA).

No push or amendment is performed. Motion implementation, original collector, historical reports/baselines, dependencies, database schema/credentials and the protected ZIP are preserved. Final status after a successful checkpoint should contain only:

```text
?? docs/reports/assets/web-design-0-4.zip
```

Phase 1A readiness is limited to the verified integration foundation and proposed contract. Live database verification and owner approval are prerequisites to Phase 1B implementation, not completed persistence.

**ADORA PRODUCT PHASE 1A — INTEGRATION FOUNDATION COMPLETE / READY FOR PHASE 1B**
