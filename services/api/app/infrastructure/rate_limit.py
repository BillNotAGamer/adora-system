"""Atomic Redis-backed protection for sensitive authentication operations."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import Settings, get_settings

INCREMENT_SCRIPT = """
local value = redis.call('INCR', KEYS[1])
if value == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {value, ttl}
"""


class RateLimitUnavailable(RuntimeError):
    """Redis failed; sensitive operations fail closed instead of bypassing protection."""


@dataclass(frozen=True)
class RateLimitExceeded(RuntimeError):
    retry_after: int


class AuthRateLimiter:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def consume(self, action: str, subject: str, limit: int) -> None:
        digest = hashlib.sha256(subject.encode("utf-8")).hexdigest()
        key = f"adora:auth-rate:{action}:{digest}"
        client: Redis = Redis.from_url(self.settings.redis_url, decode_responses=True)
        try:
            result = await client.eval(  # type: ignore[misc]
                INCREMENT_SCRIPT,
                1,
                key,
                str(self.settings.auth_rate_window_seconds),
            )
            count, ttl = int(result[0]), max(int(result[1]), 1)
        except (RedisError, OSError, TypeError, ValueError) as exc:
            raise RateLimitUnavailable("Authentication rate limiting is unavailable") from exc
        finally:
            await client.aclose()
        if count > limit:
            raise RateLimitExceeded(retry_after=ttl)
