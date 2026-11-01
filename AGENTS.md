# ADORA repository guidance

## Architecture and ownership

- `apps/web`: Next.js customer and administration surfaces. It owns presentation and browser concerns, not business invariants.
- `apps/mobile`: Expo/React Native client. Keep native storage and navigation details here.
- `services/api`: FastAPI modular monolith. HTTP routes call application/domain services; infrastructure adapters remain behind module boundaries.
- `packages/api-client`: generated TypeScript contract and thin client utilities. FastAPI OpenAPI is authoritative.
- `infrastructure`: local database and container assets. The canonical baseline SQL is immutable after application.
- `tests/db`: database integration smoke tests imported from the Phase 0.1B baseline.
- `docs`: requirements, architecture decisions, API guidance, database specifications, testing notes, and reports.

## Dependency rules

- Use the root pnpm workspace and its committed `pnpm-lock.yaml`; do not add npm or Yarn lockfiles.
- Use `pnpm --filter <workspace>` for web and shared-package dependencies.
- In `apps/mobile`, install Expo/native dependencies with `pnpm exec expo install` so SDK 58 selects compatible versions.
- Use only `services/api/.venv` for Python. Keep `pyproject.toml` readable and refresh `requirements.lock` after dependency changes.
- Client applications may depend on `packages/api-client`; they must not import backend Python modules or duplicate backend DTOs.

## Database migration policy

- `0001_adora` and `infrastructure/db/sql/0001_adora_baseline.sql` are the authoritative SQL-first baseline.
- Never run the SQL manually and then apply Alembic to the same database.
- Never edit a migration that may have been applied. Add sequential revisions (`0002`, `0003`, and so on) and document corrections.
- ORM metadata must reflect the baseline. Review every autogenerate diff; schema changes require migration and integration tests.
- Never delete Docker volumes automatically. Back up and verify restore procedures before destructive database work.
- Import every model through `app.domain.models`; there is one schema-qualified metadata registry.
- Application startup must never call `create_all()`. Run Alembic check plus the schema audit before proposing a migration.

## Identity and access rules

- FastAPI owns authentication policy. Public registration grants only `traveler`; never accept client-assigned roles.
- Store passwords only as Argon2id hashes and refresh credentials only as SHA-256 digests.
- Access JWT validation must pin the algorithm and require issuer, audience, time, subject, and token-ID claims.
- Resolve active status, current roles, and partner memberships from PostgreSQL for authorization decisions.
- A `partner` role never grants global partner access; require a matching `partner_memberships` row.
- Browser refresh credentials use HttpOnly cookies and Origin validation. Mobile refresh credentials use Expo SecureStore, never AsyncStorage.
- Do not log credentials or return validation input values. Authentication rate limiting fails closed when Redis is unavailable.

## Source of truth and testing

- Backend OpenAPI is the source of truth for client contracts; run `pnpm api:generate` after API changes.
- Run relevant lint, type checks, tests, and production builds before handing off work.
- Changes to inventory, booking, payment, voucher, or idempotency behavior require transactional integration tests.
- Do not claim device, Docker, or database verification unless it was actually executed.

## Security

- Commit placeholders only. Real credentials, tokens, payment payloads, personal data, and QR secrets must never enter source or logs.
- Browser-visible `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are public by design.
- Validate all AI output and payment callbacks server-side. Never trust client totals, inventory counts, or Return URL state.

## Future agents

- Read the nearest `AGENTS.md` before editing a subtree.
- Preserve user work and Git history. Integrate existing artifacts rather than regenerating them blindly.
- Phase 1.0 is framework/infrastructure bootstrap only; business modules begin in later phases.
