# Phase 1.0 toolchain

- Node.js 24.3 or newer in the Node 24 line.
- pnpm 12.16.1, invoked through Corepack and pinned in the root `package.json`.
- Python 3.12+ in `services/api/.venv`.
- Docker Desktop with Compose for PostgreSQL/PostGIS and Redis.
- Next.js 16 / React 19 for web and Expo SDK 58 for mobile.

The committed pnpm lockfile and Python `requirements.lock` are the reproducibility boundaries.
Expo-compatible native versions remain selected by `expo install`.
