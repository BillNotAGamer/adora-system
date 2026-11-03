"""Explicit local/test-only command for deterministic Da Lat demo catalog data."""

from __future__ import annotations

import argparse
import asyncio

from app.core.config import get_settings
from app.core.event_loop import platform_loop_factory
from app.infrastructure.database import AsyncSessionFactory
from app.modules.catalog.seed import DemoSeedConflictError, seed_demo_catalog


async def run() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Confirm additive demo writes to the configured development/test database.",
    )
    args = parser.parse_args()
    settings = get_settings()
    if not args.confirm:
        parser.error("--confirm is required")
    if settings.environment not in {"development", "test"}:
        parser.error("demo seeding is allowed only in development or test")

    async with AsyncSessionFactory() as session:
        try:
            result = await seed_demo_catalog(session)
        except DemoSeedConflictError as exc:
            print(f"Seed refused: {exc}")
            return 1
    print(
        f"Demo catalog ready: created={result.created}, existing={result.existing}. "
        "All records are demonstration data."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(), loop_factory=platform_loop_factory))
