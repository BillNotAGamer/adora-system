"""Run the Phase 1.1 schema compatibility audit against PostgreSQL."""

import asyncio
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.core.event_loop import platform_loop_factory  # noqa: E402
from app.infrastructure.database import engine  # noqa: E402
from app.infrastructure.schema_audit import audit_schema  # noqa: E402


async def run() -> None:
    async with engine.connect() as connection:
        result = await audit_schema(connection)
    await engine.dispose()
    print(
        "PASS: "
        f"{result.table_count} tables, {result.checked_columns} columns, "
        f"{result.checked_foreign_keys} critical composite foreign keys, "
        f"{result.checked_partial_indexes} critical indexes, revision {result.revision}"
    )


if __name__ == "__main__":
    asyncio.run(run(), loop_factory=platform_loop_factory)
