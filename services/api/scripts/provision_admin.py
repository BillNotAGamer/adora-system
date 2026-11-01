"""Explicit, interactive initial-administrator provisioning command."""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from pydantic import ValidationError  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.event_loop import platform_loop_factory  # noqa: E402
from app.domain.models.governance import AuditLog  # noqa: E402
from app.domain.models.identity import User, UserRole  # noqa: E402
from app.infrastructure.database import AsyncSessionFactory, engine  # noqa: E402
from app.modules.identity.schemas import RegisterRequest  # noqa: E402
from app.modules.identity.security import hash_password  # noqa: E402


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision one initial ADORA administrator")
    parser.add_argument("--email", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Required acknowledgement that this grants administrator privileges",
    )
    return parser.parse_args()


async def provision(args: argparse.Namespace, password: str) -> None:
    if not args.confirm:
        raise SystemExit("Refusing to provision without explicit --confirm")
    try:
        validated = RegisterRequest(
            email=args.email,
            display_name=args.display_name,
            password=password,
        )
    except ValidationError as exc:
        raise SystemExit("Administrator credentials do not satisfy validation policy") from exc

    settings = get_settings()
    if settings.environment == "production" and not os.getenv("JWT_SIGNING_KEY"):
        raise SystemExit("Production provisioning requires an explicit JWT_SIGNING_KEY")

    async with AsyncSessionFactory() as session, session.begin():
        existing = await session.scalar(
            select(User.id).where(User.email == str(validated.email).lower())
        )
        if existing is not None:
            raise SystemExit("Refusing to modify an existing account")
        user = User(
            email=str(validated.email).lower(),
            display_name=validated.display_name,
            password_hash=hash_password(password),
            status="active",
        )
        user.roles.append(UserRole(role="admin"))
        session.add(user)
        await session.flush()
        session.add(
            AuditLog(
                actor_user_id=user.id,
                action="identity.admin_provisioned",
                entity_type="user",
                entity_id=user.id,
                event_metadata={"mechanism": "explicit_local_command"},
            )
        )
    await engine.dispose()
    print(f"Provisioned administrator {validated.email}")


def main() -> None:
    args = parse_arguments()
    password = os.getenv("ADORA_BOOTSTRAP_ADMIN_PASSWORD") or getpass.getpass(
        "Administrator password: "
    )
    asyncio.run(provision(args, password), loop_factory=platform_loop_factory)


if __name__ == "__main__":
    main()
