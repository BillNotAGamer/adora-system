"""Redis connection helpers."""

from redis.asyncio import Redis

from app.core.config import get_settings


async def check_redis() -> None:
    """Verify Redis connectivity without retaining a readiness connection."""

    client: Redis = Redis.from_url(get_settings().redis_url)
    try:
        await client.ping()
    finally:
        await client.aclose()
