"""Password and JWT verification tests."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.modules.identity.errors import InvalidAccessTokenError
from app.modules.identity.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def secure_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "jwt_signing_key": SecretStr("unit-test-signing-secret-that-is-long-enough"),
        "jwt_issuer": "test-issuer",
        "jwt_audience": "test-audience",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_passwords_use_argon2_and_verify() -> None:
    encoded = hash_password("CorrectHorse9!Battery")
    assert encoded.startswith("$argon2id$")
    assert verify_password("CorrectHorse9!Battery", encoded)
    assert not verify_password("wrong", encoded)


def test_refresh_tokens_are_sha256_digests() -> None:
    digest = hash_refresh_token("opaque-token")
    assert len(digest) == 64
    assert digest == hash_refresh_token("opaque-token")


def test_valid_access_token_has_required_verified_claims() -> None:
    settings = secure_settings()
    user_id = uuid4()
    claims = decode_access_token(create_access_token(user_id, settings), settings)
    assert claims.subject == user_id
    assert claims.token_id
    assert claims.expires_at > datetime.now(UTC)


@pytest.mark.parametrize(
    "override",
    [
        {"jwt_signing_key": SecretStr("different-signing-secret-that-is-long-enough")},
        {"jwt_issuer": "wrong-issuer"},
        {"jwt_audience": "wrong-audience"},
    ],
)
def test_access_token_rejects_signature_issuer_and_audience(
    override: dict[str, object],
) -> None:
    token = create_access_token(uuid4(), secure_settings())
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(token, secure_settings(**override))


def test_access_token_rejects_expired_token() -> None:
    settings = secure_settings()
    token = create_access_token(uuid4(), settings, now=datetime.now(UTC) - timedelta(minutes=30))
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(token, settings)


def test_access_token_rejects_missing_required_claims() -> None:
    settings = secure_settings()
    token = jwt.encode(
        {"sub": str(uuid4()), "exp": datetime.now(UTC) + timedelta(minutes=5)},
        settings.jwt_signing_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(token, settings)


def test_production_rejects_development_signing_secret() -> None:
    with pytest.raises(ValueError, match="strong JWT_SIGNING_KEY"):
        Settings(_env_file=None, environment="production")
