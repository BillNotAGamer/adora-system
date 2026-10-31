# Monorepo architecture

ADORA uses pnpm workspaces without an additional task orchestrator. At this scale, pnpm's
topological recursive execution is sufficient and keeps the bootstrap transparent.

The web and mobile applications are delivery adapters. `services/api` is the modular-monolith
system of record and owns validation, transactions, and OpenAPI. `packages/api-client` is generated
from that contract. PostgreSQL remains the transactional source of truth; Redis is supporting cache
infrastructure and must not become the only record of inventory holds.

Python is intentionally outside the JavaScript workspace. Its local virtual environment and lock
file live under `services/api`, while root scripts provide a consistent developer entry point.
