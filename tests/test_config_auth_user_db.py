import pytest

from gens.config import AuthUserDb, Settings


def get_base_settings_kwargs() -> dict:
    return {
        "gens_db": {"connection": "mongodb://localhost:27017/gens"},
        "gens_api_url": "http://localhost:5000/",
    }


def test_auth_user_db_variant_requires_variant_db() -> None:
    kwargs = {
        **get_base_settings_kwargs(),
        "auth_user_db": AuthUserDb.VARIANT,
    }

    with pytest.raises(ValueError, match="auth_user_db='variant' requires variant_db"):
        Settings(**kwargs)


def test_auth_user_db_variant_is_valid_when_variant_db_is_configured() -> None:
    kwargs = {
        **get_base_settings_kwargs(),
        "auth_user_db": AuthUserDb.VARIANT,
        "variant_db": {"connection": "mongodb://localhost:27017/scout"},
    }

    settings = Settings(**kwargs)

    assert settings.auth_user_db == AuthUserDb.VARIANT
