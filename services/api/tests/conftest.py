"""PostgreSQL/Redis integration fixtures that never reset existing data."""

from __future__ import annotations

import asyncio
import platform
from collections.abc import AsyncIterator

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession

from app.infrastructure.database import engine, get_session
from app.main import app


def pytest_asyncio_loop_factories(config: object, item: object):  # type: ignore[no-untyped-def]
    del config, item
    if platform.system() == "Windows":
        return {"selector": asyncio.SelectorEventLoop}
    return {"default": asyncio.new_event_loop}


@pytest_asyncio.fixture
async def database_connection() -> AsyncIterator[AsyncConnection]:
    async with engine.connect() as connection:
        transaction = await connection.begin()
        try:
            yield connection
        finally:
            await transaction.rollback()


@pytest_asyncio.fixture
async def db_session(database_connection: AsyncConnection) -> AsyncIterator[AsyncSession]:
    async with AsyncSession(
        bind=database_connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    ) as session:
        yield session


@pytest_asyncio.fixture
async def api_client(database_connection: AsyncConnection) -> AsyncIterator[httpx.AsyncClient]:
    async def override_session() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(
            bind=database_connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_session, None)
