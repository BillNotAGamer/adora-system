# ADORA

ADORA is an AI-powered smart travel planning and integrated booking platform for Vietnam. This
repository is a production-oriented monorepo built as a modular monolith with clean boundaries:
Next.js for web, Expo for mobile, FastAPI for the authoritative API, PostgreSQL/PostGIS for
transactions and geospatial data, and Redis for supporting infrastructure.

Phase 1.0 establishes framework and infrastructure foundations only. Business booking, payment,
voucher, and AI-planning workflows belong to later phases.

## Repository map

- `apps/web` — Next.js 16 customer/admin shell with Tailwind, shadcn conventions, and TanStack.
- `apps/mobile` — Expo SDK 58 app with Expo Router, SecureStore, and TanStack Query.
- `services/api` — FastAPI modular monolith, Alembic, local virtual environment, and tests.
- `packages/api-client` — OpenAPI-generated TypeScript contract and client utilities.
- `infrastructure` — canonical database SQL and local container guidance.
- `docs` — architecture, API, database, testing, requirements, and implementation reports.

The SQL-first `0001_adora` migration and 24-table schema were imported from the read-only
`Adora_Database_Baseline_v1.0` sibling directory. Do not execute its SQL manually before Alembic.

## Prerequisites

- Node.js 24.3+ in the Node 24 line (the workspace pins 24.19.0 for pnpm execution).
- Corepack and pnpm 12.16.1.
- Python 3.12+.
- Docker Desktop with Compose.

## Windows PowerShell quick start

```powershell
Set-Location 'F:\Coding\Adora System Mega Project\adora-system'
Copy-Item .env.example .env
# If port 5432 is already used, change POSTGRES_PORT and DATABASE_URL in .env together.

corepack pnpm@12.16.1 install --frozen-lockfile
python -m venv services\api\.venv
services\api\.venv\Scripts\python.exe -m pip install -r services\api\requirements.lock

docker compose up -d db redis
docker compose ps

$env:DATABASE_URL = (Get-Content .env | Where-Object { $_ -like 'DATABASE_URL=*' }) -replace '^DATABASE_URL=', ''
services\api\.venv\Scripts\python.exe -m alembic -c services\api\alembic.ini upgrade head
```

The checked local environment on this machine uses PostgreSQL host port `55432`, because an
unrelated PostgreSQL service already owns 5432. Compose still defaults to 5432 for other machines.

## Run applications

Open separate PowerShell terminals from the repository root:

```powershell
corepack pnpm@12.16.1 dev:web       # http://localhost:3000
corepack pnpm@12.16.1 dev:mobile    # Expo development server
corepack pnpm@12.16.1 dev:api       # http://localhost:8000
```

On an Android emulator, the mobile fallback API URL is `http://10.0.2.2:8000`. For a physical
device, set `EXPO_PUBLIC_API_BASE_URL` to the development machine's reachable LAN address.

## Verification

```powershell
corepack pnpm@12.16.1 lint
corepack pnpm@12.16.1 typecheck
corepack pnpm@12.16.1 test
corepack pnpm@12.16.1 build
corepack pnpm@12.16.1 --filter @adora/mobile run doctor
corepack pnpm@12.16.1 api:generate
```

Database verification after migration:

```powershell
docker compose exec db psql -U adora -d adora -c "SELECT PostGIS_Version();"
docker compose exec db psql -U adora -d adora -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='adora' AND table_type='BASE TABLE';"
services\api\.venv\Scripts\python.exe tests\db\smoke_test.py
```

Expected business table count: **24**. The smoke test always rolls back its fixture data.

## API contract

FastAPI OpenAPI is authoritative. Run `corepack pnpm@12.16.1 api:generate` after route/model changes,
then review and commit the generated `packages/api-client/src/schema.d.ts` change.

See [AGENTS.md](AGENTS.md) for dependency, migration, testing, and security policies, and
[the Phase 1.0 report](docs/reports/PHASE_1_0_MONOREPO_BOOTSTRAP_REPORT.md) for verified outcomes.
