# ADORA

A cinematic travel discovery and itinerary-planning experience for Vietnam, developed as a Software Engineering graduation project.

**Luxury Editorial × Cinematic Travel × Intelligent Planning**

## Current status

The customer web experience includes an editorial homepage, destination and experience discovery with filters, detail pages, sample trips, and an interactive itinerary demonstration. Responsive layouts, keyboard interactions, reduced-motion support, and cinematic motion have automated regression coverage.

The AI Planner uses **scripted demonstration responses**. Live AI generation, booking, checkout, payment processing, and production deployment are not implemented. Editorial/demo content is not a live offer or availability guarantee.

The FastAPI service contains PostgreSQL ORM mappings, authentication/session foundations, role and partner authorization, and Catalog/Partner APIs. The frontend currently works with editorial fixtures and an intentional Catalog fallback when the API is offline. Live database integration and full backend regression verification await infrastructure configuration; frontend verification is not a full-stack production-readiness claim.

## Stack and repository

| Area | Implementation |
|---|---|
| Web | Next.js 16.4.3, React 19.3.0, strict TypeScript, Tailwind CSS 4 |
| Mobile foundation | Expo SDK 58, Expo Router, SecureStore |
| API | Python 3.12+, FastAPI, SQLAlchemy 2, Alembic, psycopg |
| Data infrastructure | PostgreSQL 18 / PostGIS 3.6, Redis |
| Contracts | FastAPI OpenAPI → generated TypeScript API client |
| Workspace | Node.js 24, pnpm 12.16.1 workspaces |

```text
apps/web/             Customer web experience
apps/mobile/          Expo application foundation
services/api/         FastAPI modular monolith, ORM, migrations, tests
packages/api-client/  Generated contract and client utilities
infrastructure/       Canonical SQL and local infrastructure guidance
scripts/              Development, verification, contract and metrics tools
tests/db/             PostgreSQL smoke tests
docs/                 Architecture, API, design and verification reports
```

Backend modules own business rules; clients consume the generated API contract. The canonical `0001_adora` migration defines the 24-table database baseline. See [AGENTS.md](AGENTS.md) for architecture and migration policies.

## Run the frontend

Use Node.js **24.3+ within the 24.x line** (verified with 24.19.0) and Corepack. Commands below run from a clone of this repository in PowerShell:

```powershell
corepack pnpm@12.16.1 install --frozen-lockfile
corepack pnpm@12.16.1 --filter @adora/api-client build
corepack pnpm@12.16.1 dev:web
```

Open `http://localhost:3000`. PostgreSQL, Redis, and API credentials are not needed for the frontend demonstration. The optional `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000`; set it in the shell before starting Next.js, or in ignored `apps/web/.env.local`. All `NEXT_PUBLIC_*` values are public browser configuration, never secrets.

## Optional backend and mobile development

Backend development requires Python 3.12+, PostgreSQL/PostGIS and Redis. Docker Compose is available for local infrastructure; a hosted database can be configured separately by the project owner.

```powershell
# Copy only if .env does not already exist; edit placeholders for your local setup.
Copy-Item .env.example .env
python -m venv services/api/.venv
services/api/.venv/Scripts/python.exe -m pip install -r services/api/requirements.lock
docker compose up -d db redis
services/api/.venv/Scripts/python.exe -m alembic -c services/api/alembic.ini upgrade head
corepack pnpm@12.16.1 dev:api
```

The example uses host port 55432; keep `POSTGRES_PORT` and `DATABASE_URL` consistent. Never run the canonical SQL manually before applying the migration. Use a new, controlled development database and consult [database documentation](docs/database) before applying migrations to existing data. Replace development placeholders before any shared environment; never commit local environment files.

For mobile, run `corepack pnpm@12.16.1 dev:mobile`. Optional `EXPO_PUBLIC_API_BASE_URL` belongs in the mobile process environment or ignored `apps/mobile/.env`. Android emulator fallback is `http://10.0.2.2:8000`; physical devices need a reachable development API address. This is an application foundation, not a completed mobile travel experience.

## Verification

```powershell
corepack pnpm@12.16.1 --filter @adora/api-client typecheck
corepack pnpm@12.16.1 --filter @adora/api-client build
corepack pnpm@12.16.1 --filter @adora/web test
corepack pnpm@12.16.1 --filter @adora/web lint
corepack pnpm@12.16.1 --filter @adora/web typecheck
corepack pnpm@12.16.1 --filter @adora/web build
```

The verified baseline has 22 web tests and 20 generated Next.js routes. Builds fetch the configured Google Fonts and need network access on a cold cache. Database-backed tests require PostgreSQL/Redis; root `test`, `lint`, and `typecheck` also include backend tooling and should not be confused with frontend-only checks.

Browser regression scripts use Windows Chrome by default and a production server on port 3100. Set `ADORA_VERIFY_OUTPUT` to a directory **outside the repository** before running `verify_web_0_3.mjs`, `verify_homepage.mjs`, or `verify_web_0_4.mjs` to preserve tracked screenshots. Coverage includes responsive geometry, keyboard/focus behavior, reduced motion, Activity restoration, and motion assertions. Headless checks do not replace physical-device or screen-reader testing.

Performance work records raw cold-run measurements and limitations. H2 did not establish motion-runtime causation; H3 retained the original destination image after a measured no-change evaluation. See [H3 results and visual evidence](docs/reports/POST_0_4_H3_DESTINATION_IMAGE_OPTIMIZATION_REPORT.md) and the [homepage capture](docs/reports/assets/web-design-0-2/desktop-hero.png).

After backend contract changes, run `corepack pnpm@12.16.1 api:generate`, review the generated types, and rebuild the API client.

## Roadmap

- Restore and verify live frontend/backend data integration.
- Expand persistent travel data and finalize operational requirements.
- Integrate live AI planning after the demonstration experience is reviewed.
- Complete business workflows and deployment verification in separately scoped phases.

## Licensing and asset provenance

No project-wide open-source license has been selected. This publication preparation does not add one. The existing `apps/mobile/LICENSE` is an Expo template attribution/license, not a declaration that all ADORA code has that license. Dependency and font licenses remain their respective licenses.

Travel illustrations are project-generated images, not documentary destination photography or copied reference-site media. Their provenance is recorded in [implementation notes](docs/design/WEB_DESIGN_0_2_IMPLEMENTATION.md). Design references are acknowledged in the Blueprint; no affiliation is implied. Final commercial asset/brand review remains separate from this educational portfolio repository.
