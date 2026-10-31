# ADORA Phase 1.0 — Monorepo Bootstrap Report

**Date:** 2026-10-31 (Asia/Bangkok)  
**Outcome:** COMPLETE  
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`

## 1. Executive summary

Phase 1.0 produced a working pnpm monorepo with a Next.js 16 web shell, Expo SDK 58 mobile
shell, FastAPI modular-monolith foundation, generated OpenAPI TypeScript client, PostgreSQL 18 /
PostGIS 3.6 and Redis development infrastructure, baseline CI, quality tooling, and governance
documentation.

The external read-only database baseline was inspected recursively and integrated without another
nesting level. Its canonical SQL, `0001_adora` revision, Alembic runner, database specifications,
and smoke test match the source files byte-for-byte. The canonical SQL was not executed manually;
Alembic applied it once to an empty database. Verification confirmed PostGIS 3.6, 24 business
tables, revision `0001_adora`, and all baseline smoke invariants.

All acceptance gates pass. Native Android/iOS runtime execution was not claimed; Expo lint,
TypeScript, Expo Doctor (20/20), dependency compatibility, and a production web export passed.

## 2. Git baseline and final state

### Initial state

- The authoritative directory existed but was empty.
- No Git repository existed in the directory or its parents.
- A new repository was initialized at the exact target root with branch `main`.
- No pre-existing history or uncommitted work existed to preserve.

### Final state

- Branch: `main`
- HEAD: `UNBORN` (no commit existed and no commit was created without explicit instruction)
- Working tree: all Phase 1.0 files are untracked and ready for review/initial commit.
- Nested generator Git metadata in `apps/web/.git` and `apps/mobile/.git` was removed; the Expo
  generator's automatic `Initial commit` belonged only to the new scaffold. The monorepo has one
  repository only.
- Git safe-directory configuration was supplied per command; global Git configuration was not
  changed.

## 3. Created, integrated, and modified files

### Root and governance

- Created `.editorconfig`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
  `tsconfig.base.json`, `AGENTS.md`, and root `README.md`.
- Expanded `.gitignore` and `.env.example`; created ignored local `.env` with development-only
  placeholders and the machine-specific PostgreSQL port override.
- Added `scripts/bootstrap.ps1` and `scripts/verify.ps1`.
- Added `.github/workflows/ci.yml` with JavaScript, API, and PostGIS migration jobs.

### Web

- Created the official Next.js 16.4.3 App Router scaffold in `apps/web`.
- Added the ADORA landing page, root layout, TanStack Query provider, reusable site shell,
  shadcn-style button primitive, API URL module, Tailwind styles, strict TypeScript, and
  `components.json`.
- Added TanStack Query/Table, Zod, Lucide, and shadcn utility dependencies.

### Mobile

- Created the official Expo SDK 58 scaffold in `apps/mobile`.
- Added Expo Router stack navigation, ADORA welcome/about screens, Query provider, API URL module,
  SecureStore session adapter, ESLint flat config, strict TypeScript, Expo Doctor, and web export.
- Removed unused tutorial source components that were not part of the ADORA shell; retained the
  official assets and SDK-compatible native dependency set.

### API

- Created `services/api/pyproject.toml`, pinned `requirements.lock`, FastAPI application factory,
  settings, structured JSON logging, error envelopes, request correlation, API router, health and
  dependency-aware readiness endpoints, async SQLAlchemy session/engine, Redis readiness adapter,
  tests, OpenAPI export script, and a Windows-compatible Uvicorn runner.
- Added the requested runtime packages (FastAPI, Uvicorn, Pydantic Settings, SQLAlchemy, Alembic,
  psycopg, GeoAlchemy2, Redis, HTTPX, multipart, pwdlib/Argon2, PyJWT, Google GenAI) and development
  packages (pytest, pytest-asyncio, Ruff, mypy).

### Database baseline imports

Imported unchanged from `Adora_Database_Baseline_v1.0\adora`:

- `infrastructure/db/sql/0001_adora_baseline.sql`
- `services/api/alembic/versions/0001_adora_baseline.py`
- `services/api/alembic/env.py`
- `services/api/requirements-db-bootstrap.txt`
- `tests/db/smoke_test.py`
- `docs/database/SCHEMA_SPEC_V1.md`
- `docs/database/RELATIONSHIPS.mmd`
- `docs/database/QUICKSTART_VI.md`

Integration deviations were limited to the surrounding bootstrap configuration:

- `compose.yaml` retained PostgreSQL 18/PostGIS 3.6 and the correct `/var/lib/postgresql` mount,
  and added named Redis persistence, health checks, a local network, restart policy, and an
  overridable host PostgreSQL port.
- `services/api/alembic.ini` kept the baseline revision location but replaced the old local password
  default and uses explicit IPv4 localhost to avoid Windows `localhost`/IPv6 connection stalls.
- No SQL, migration, relationship, specification, or smoke-test logic was rewritten.

### API client and documentation

- Created `packages/api-client` with `openapi-typescript`, generated `schema.d.ts`, a typed health
  client, TypeScript build, and generation documentation.
- Added monorepo architecture, toolchain, API contract, testing, Docker, and this report under
  `docs` and `infrastructure/docker`.

## 4. Final directory tree

```text
adora-system/
├── .github/workflows/ci.yml
├── apps/
│   ├── mobile/
│   │   ├── assets/
│   │   ├── src/app/{_layout,index,about}.tsx
│   │   ├── src/config/api.ts
│   │   ├── src/storage/secure-session.ts
│   │   ├── app.json
│   │   ├── eslint.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── public/
│       ├── src/app/{layout,page,providers}.tsx
│       ├── src/app/globals.css
│       ├── src/components/{layout,ui}/
│       ├── src/lib/{api,utils}.ts
│       ├── components.json
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── services/api/
│   ├── app/
│   │   ├── api/routes/{health,readiness}.py
│   │   ├── core/{config,errors,event_loop,logging,middleware}.py
│   │   ├── infrastructure/{cache,database}.py
│   │   ├── modules/
│   │   └── main.py
│   ├── alembic/versions/0001_adora_baseline.py
│   ├── scripts/{export_openapi,run_server}.py
│   ├── tests/test_system_endpoints.py
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── requirements.lock
├── packages/api-client/
│   ├── src/{index,schema.d}.ts
│   ├── package.json
│   └── tsconfig.json
├── infrastructure/
│   ├── db/sql/0001_adora_baseline.sql
│   └── docker/README.md
├── docs/
│   ├── api/OPENAPI.md
│   ├── architecture/MONOREPO.md
│   ├── database/{QUICKSTART_VI,RELATIONSHIPS,SCHEMA_SPEC_V1}.*
│   ├── requirements/TOOLCHAIN.md
│   ├── testing/VERIFICATION.md
│   └── reports/PHASE_1_0_MONOREPO_BOOTSTRAP_REPORT.md
├── scripts/{bootstrap,verify}.ps1
├── tests/db/smoke_test.py
├── .editorconfig
├── .env.example
├── .gitignore
├── AGENTS.md
├── compose.yaml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.base.json
```

Generated/ignored directories include `node_modules`, `.next`, `.expo`, `dist`, `.venv`, caches,
and the local `.env`.

## 5. Installed framework and package versions

### JavaScript / TypeScript

| Component | Resolved version |
|---|---:|
| pnpm | 12.16.1 |
| Next.js | 16.4.3 |
| React / React DOM | 19.3.0 |
| Expo | 58.0.21 |
| React Native | 0.88.1 |
| Expo Router | 58.0.28 |
| Expo SecureStore | 58.0.2 |
| TanStack Query | 5.105.0 |
| TanStack Table | 9.3.1 |
| Zod | 4.6.7 |
| Tailwind CSS | 4.3.3 |
| TypeScript (web/client) | 5.9.3 |
| TypeScript (Expo SDK template) | 6.0.3 |
| openapi-typescript | 7.10.1 |

### Python

| Component | Resolved version |
|---|---:|
| FastAPI | 0.162.0 |
| Uvicorn | 0.54.0 |
| Pydantic / Settings | 2.14.2 / 2.16.2 |
| SQLAlchemy | 2.0.55 |
| Alembic | 1.20.1 |
| psycopg / binary | 3.3.6 |
| GeoAlchemy2 | 0.20.0 |
| redis-py | 6.4.0 |
| HTTPX | 0.28.1 |
| pwdlib | 0.3.1 |
| PyJWT | 2.15.1 |
| google-genai | 1.75.0 |
| pytest / pytest-asyncio | 8.4.2 / 1.4.1 |
| Ruff / mypy | 0.17.3 / 1.20.2 |

## 6. Runtime verification

| Runtime/tool | Result |
|---|---|
| Node.js | `v24.19.0` — satisfies Node 24.x / minimum 24.3 |
| Node path | Sandbox preflight: `C:\Program Files\nodejs\node.exe`; host/FNM context also resolved Node 24.19.0 |
| npm | `11.17.0`; not used for repository locking |
| Corepack | `0.35.0` |
| pnpm | `12.16.1`; workspace execution pins Node `24.19.0` |
| Python | `3.12.3` at `C:\Python312\python.exe` |
| API virtual environment | `services/api/.venv`, Python `3.12.3` |
| Git | `2.46.1.windows.1` |
| Docker Engine | `29.0.1` |
| Docker Compose | `v2.40.3-desktop.1` |

No global PATH, Node, Python, or system package changes were made.

## 7. Docker services and health

Docker Desktop was initially installed but stopped. It was started in the background for
verification. The host already had an unrelated PostgreSQL process listening on 5432; it was not
stopped or modified. `POSTGRES_PORT` support was added and the ignored local `.env` selects 55432.

| Service | Image | Final state | Host binding |
|---|---|---|---|
| PostgreSQL/PostGIS | `postgis/postgis:18-3.6` | healthy | `127.0.0.1:55432 -> 5432` |
| Redis | `redis:7.4-alpine` | healthy, `PONG` | `127.0.0.1:6379 -> 6379` |

Named volumes `adora_pgdata` and `adora_redisdata` were created and retained. No `down -v`, volume
deletion, or unrelated service stop was executed. Containers remain running for local development.

## 8. Database schema and migration verification

- Pre-migration business table count: `0`.
- Alembic chain: one root/head, `0001_adora`.
- Applied revision: `0001_adora` through Alembic only.
- PostgreSQL runtime: `18.6`.
- PostGIS: `3.6`.
- Final `adora` business table count: `24`.
- Baseline smoke test: `PASS: 24 tables, PostGIS lookup, inventory guard, quote ownership FK`.
- Smoke fixtures rolled back; no test rows persisted.
- Canonical SQL and immutable migration SHA-256 hashes match the external baseline exactly.
- No competing initial schema or ORM-generated migration was created. ORM model mapping remains a
  later implementation task and must mirror this baseline before autogeneration is enabled.

## 9. Commands executed and outcomes

| Command/workflow | Outcome |
|---|---|
| Preflight Git/runtime/Docker/config audit | Completed; target was empty, toolchain identified |
| Official Next.js 16.4.3 generator (`--skip-install`) | PASS |
| Official Expo `default@sdk-58` generator (`--no-install`) | PASS |
| `corepack pnpm@12.16.1 install --frozen-lockfile` | PASS |
| Expo SDK-aware installs / `expo install --check` | PASS; dependencies up to date |
| `expo-doctor` | PASS, 20/20 checks |
| Project-local venv install from `pyproject.toml` | PASS |
| Python freeze to `requirements.lock` | PASS |
| `docker compose config --quiet` | PASS |
| `docker compose up -d db redis` | PASS after non-invasive port override |
| Alembic `heads`, `current`, `upgrade head` | PASS; one head, applied once |
| Database smoke test | PASS |
| `pnpm api:generate` and API-client build | PASS |
| Root `dev:web` and `dev:api` smoke | PASS; HTTP 200 / readiness `ready` |

Investigated and repaired failures:

1. pnpm 12 blocked an unreviewed native build. `allowBuilds` now permits only
   `unrs-resolver`; frozen install passes.
2. Expo's generic lint install selected ESLint 10, incompatible with its React plugin peers.
   ESLint was aligned to 9.39.5; peer check and lint pass.
3. PostgreSQL host port 5432 was occupied by an existing process. ADORA uses configurable port
   55432 locally; the existing service was untouched.
4. Windows Uvicorn selected a Proactor event loop, rejected by async psycopg. The ADORA runner now
   selects a Windows Selector loop; live readiness changed from 503 to 200.
5. `localhost` attempted the unmapped IPv6 path for host database access. Local database URLs use
   explicit `127.0.0.1`.

## 10. Automated test and build results

| Check | Result |
|---|---|
| Root JavaScript ESLint | PASS (web and mobile) |
| Ruff | PASS |
| Web strict TypeScript | PASS |
| Mobile strict TypeScript | PASS |
| API client TypeScript | PASS |
| mypy strict | PASS, 17 source files |
| pytest | PASS, 3 tests |
| Next.js production build | PASS, static `/` and `/_not-found` |
| Expo production web export | PASS |
| API client build | PASS |
| FastAPI import/OpenAPI construction | PASS |
| Live `/api/v1/health` | PASS, HTTP 200 |
| Live `/api/v1/ready` | PASS, database and Redis `ok` |
| Live `/openapi.json` | PASS |
| Generated client health request | PASS |
| Rendered Next.js production/dev page | PASS, HTTP 200 and ADORA identity present |
| Database smoke test | PASS |

## 11. Warnings and unresolved items

- No Android emulator or physical device was available; no native mobile runtime/build is claimed.
  The supported Windows checks (lint, TypeScript, Expo Doctor, dependency check, web bundle) passed.
- iOS native builds were not attempted on Windows.
- pytest emits an upstream FastAPI/Starlette warning that `starlette.testclient`'s HTTPX adapter is
  deprecated in favor of `httpx2`; tests pass and no stable migration was required for Phase 1.0.
- Next/Expo lint peers currently require ESLint 9.39.5 while pnpm marks that major deprecated in
  favor of ESLint 10. Upgrading early breaks Expo's React plugin; revisit after framework support.
- pnpm detected an optional package-provided agent skill in TanStack Table. It remains deliberately
  unapproved and is irrelevant to install, build, or runtime.
- Git has no initial commit. Review the generated tree and create the initial commit when desired.
- Production secrets, managed databases, deployment configuration, seed data, ORM table mappings,
  and Phase 1.1 business modules are intentionally outside this phase.

## 12. Local startup commands

From `F:\Coding\Adora System Mega Project\adora-system`:

```powershell
# Install / restore
corepack pnpm@12.16.1 install --frozen-lockfile
.\scripts\bootstrap.ps1

# PostgreSQL/PostGIS and Redis (uses ignored .env; currently PostgreSQL host port 55432)
docker compose up -d db redis
docker compose ps

# Apply migrations to an empty/unmigrated database
$env:DATABASE_URL = 'postgresql+psycopg://adora:change_me_for_local_development@127.0.0.1:55432/adora?connect_timeout=5'
services\api\.venv\Scripts\python.exe -m alembic -c services\api\alembic.ini upgrade head

# API
corepack pnpm@12.16.1 dev:api

# Web
corepack pnpm@12.16.1 dev:web

# Mobile / Expo
corepack pnpm@12.16.1 dev:mobile

# Quality gates
.\scripts\verify.ps1
corepack pnpm@12.16.1 --filter @adora/mobile run doctor
```

## 13. Acceptance gates and Phase 1.1 readiness

| Gate | Status | Evidence |
|---|---|---|
| A — Workspace | **PASS** | Exact root used; one Git repo; baseline sibling untouched; target structure present |
| B — Dependencies | **PASS** | Frozen pnpm install, SDK-compatible Expo graph, local Python install, both lockfiles |
| C — Web | **PASS** | ESLint, TypeScript, production build, and HTTP render passed |
| D — Mobile | **PASS** | ESLint, TypeScript, dependency check, Expo Doctor 20/20, and web export passed |
| E — Backend | **PASS** | Imports, Ruff, mypy, pytest, live app, OpenAPI, health, and readiness passed |
| F — Database | **PASS** | Healthy PostgreSQL/PostGIS + Redis, Alembic, 24 tables, smoke test passed |
| G — Integration | **PASS** | Web/mobile API config, generated client, root scripts, docs, and secret scan passed |

**Readiness assessment:** Phase 1.0 is complete and the repository is ready for Phase 1.1. Before
business CRUD or booking work begins, create SQLAlchemy models that faithfully map the authoritative
24-table baseline and add schema-drift/integration coverage. Do not edit `0001_adora`; all schema
changes must begin with `0002`.
