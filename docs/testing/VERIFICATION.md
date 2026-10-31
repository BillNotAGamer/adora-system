# Verification strategy

- Web: ESLint, strict TypeScript, and `next build`.
- Mobile: Expo lint, strict TypeScript, Expo Doctor, and a supported static web export. Device and
  native runtime checks remain separate and must be reported honestly.
- API: Ruff, mypy, pytest, import/startup checks, OpenAPI, health, and readiness behavior.
- Database: Alembic on an empty PostgreSQL/PostGIS database followed by the rollback-only smoke test.

Never run the canonical baseline SQL manually before Alembic. Never delete Docker volumes as part of
routine verification.
