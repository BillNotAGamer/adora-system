"""Rate limiter failure policy tests."""

import pytest

from app.core.config import Settings
from app.infrastructure.rate_limit import AuthRateLimiter, RateLimitUnavailable


@pytest.mark.asyncio
async def test_auth_rate_limiter_fails_closed_when_redis_is_unavailable() -> None:
    settings = Settings(_env_file=None, redis_url="redis://127.0.0.1:1/15")
    with pytest.raises(RateLimitUnavailable):
        await AuthRateLimiter(settings).consume("login", "unavailable-test", 5)
