"""Definition of fixtures, test data and dependency stubs."""

from __future__ import annotations

import sys
import types
from typing import Any

from tests.utils.stub import register_stub

# ---------------------------------------------------------------------------
# Stub out optional third party modules that are not available in the
# execution environment used for the tests.  Only minimal functionality
# required for module imports is provided.
# ---------------------------------------------------------------------------

# Flask and related utilities
# flask_stub = types.ModuleType("flask")


class _Flask:  # pragma: no cover - placeholder class
    def __init__(self, *args, **kwargs) -> None:
        pass


def _redirect(*args, **kwargs) -> None:  # pragma: no cover
    return None


class _Request:  # pragma: no cover
    endpoint: str | None = None
    path: str = ""
    query_string: bytes = b""


def _url_for(*args, **kwargs) -> str:  # pragma: no cover
    return ""


register_stub(
    "flask",
    {
        "Flask": _Flask,
        "redirect": _redirect,
        "request": _Request(),
        "url_for": _url_for,
    },
)


class _FlaskGroup:  # pragma: no cover
    def __init__(self, *a, **kw):
        pass

    def add_command(self, *a, **kw):
        pass


register_stub("flask.cli", {"FlaskGroup": _FlaskGroup})


# flask_compress
class _Compress:  # pragma: no cover
    def init_app(self, app) -> None:
        pass


register_stub("flask_compress", {"Compress": _Compress})


# flask_login
class _LoginManager:  # pragma: no cover
    def init_app(self, app) -> None:
        pass


register_stub(
    "flask_login",
    {
        "LoginManager": _LoginManager,
        "current_user": types.SimpleNamespace(is_authenticated=False),
        "UserMixin": object,
    },
)


class _OAuth:  # pragma: no cover
    def init_app(self, app) -> None:
        pass

    def register(self, *a, **kw) -> None:
        pass


register_stub("authlib.integration.flask_client", {"OAuth": _OAuth})


class _Response:
    pass


register_stub("werkzeug.wrappers.response", {"Response": _Response})


class _WsgiToAsgi:
    def __init__(self, app) -> None:
        self.app = app


register_stub("asgiref.wsgi", {"WsgiToAsgi": _WsgiToAsgi})


class _IndexModel:
    def __init__(self, *a, **kw) -> None:
        self.document = kw


class _Database:
    @classmethod
    def __class_getitem__(cls, item):
        return cls


class _Collection:
    @classmethod
    def __class_getitem__(cls, item):  # pragma: no cover
        return cls


class _Cursor:
    pass


class _DuplicateKeyError(Exception):
    pass


def _parse_uri(uri: str) -> dict[str, str | None]:  # pragma: no cover
    return {"database": None}


register_stub(
    "pymongo",
    {
        "ASCENDING": 1,
        "DESCENDING": -1,
        "IndexModel": _IndexModel,
        "TEXT": "text",
        "MongoClient": object,
    },
)
register_stub("pymongo.database", {"Database": _Database})
register_stub("pymongo.collection", {"Collection": _Collection})
register_stub("pymongo.cursor", {"Cursor": _Cursor})
register_stub("pymongo.errors", {"DuplicateKeyError": _DuplicateKeyError})
register_stub("pymongo.uri_parser", {"parse_uri": _parse_uri})

# pydantic v2 compatibility helpers
import pydantic

if not hasattr(pydantic, "model_validator"):

    def model_validator(*args, **kwargs):  # type: ignore
        def decorator(fn):
            return fn

        return decorator

    pydantic.model_validator = model_validator  # type: ignore

if not hasattr(pydantic, "computed_field"):

    def computed_field(*args, **kwargs):  # type: ignore
        def decorator(fn):
            return fn

        return decorator

    pydantic.computed_field = computed_field  # type: ignore

if not hasattr(pydantic, "field_validator"):

    def field_validator(*args, **kwargs):  # type: ignore
        def decorator(fn):
            return fn

        return decorator

    pydantic.field_validator = field_validator  # type: ignore

if not hasattr(pydantic, "field_serializer"):

    def field_serializer(*args, **kwargs):  # type: ignore
        def decorator(fn):
            return fn

        return decorator

    pydantic.field_serializer = field_serializer  # type: ignore

if not hasattr(pydantic.BaseModel, "model_validate"):

    @classmethod
    def model_validate(cls, obj):  # type: ignore
        return cls.parse_obj(obj)

    pydantic.BaseModel.model_validate = model_validate  # type: ignore

if not hasattr(pydantic.BaseModel, "model_dump"):

    def model_dump(self, *args, **kwargs):  # type: ignore
        return self.dict(*args, **kwargs)

    pydantic.BaseModel.model_dump = model_dump  # type: ignore


class _TomlConfigSettingsSource:  # pragma: no cover
    def __init__(self, *a, **k):
        pass


register_stub(
    "pydantic_settings",
    {
        "BaseSettings": object,
        "PydanticBaseSettingsSource": object,
        "SettingsConfigDict": dict,
        "TomlConfigSettingsSource": _TomlConfigSettingsSource,
    },
)


class _Color:  # pragma: no cover
    def __init__(self, *a, **k):
        pass


register_stub("pydantic_extra_types.color", {"Color": _Color})


class _ObjectId:  # pragma: no cover
    def __init__(self, *a, **k):
        pass


register_stub("bson", {"ObjectId": _ObjectId})

# pydantic_core stub for BaseModel support
pydantic_core_stub = types.ModuleType("pydantic_core")
core_schema_stub = types.SimpleNamespace(CoreSchema=object)


def _union_schema(*args, **kwargs):
    return object


def _to_string_ser_schema(*args, **kwargs):
    return object


register_stub(
    "pydantic_core",
    {
        "core_schema": types.SimpleNamespace(
            union_schema=_union_schema,
            to_string_ser_schema=_to_string_ser_schema,
            CoreSchema=object,
        ),
        "PydanticCustomError": type("_PydanticCustomError", (Exception,), {}),
    },
)


def _dummy_get(*a, **kw):  # pragma: no cover
    class Resp:
        status_code = 200

        def json(self):
            return {}

    return Resp()


register_stub("requests", {"get": _dummy_get})

register_stub("email_validator")


def _create_app():  # pragma: no cover
    return None


register_stub("gens.app", {"create_app": _create_app})


class _DBConf:
    def __init__(self):
        self.connection = "mongodb://localhost:27017"
        self.database = "gens-test"


class _Settings:
    def __init__(self):
        self.gens_db = _DBConf()
        self.scout_db = _DBConf()


register_stub("gens.config", {"settings": _Settings()})

# ---------------------------------------------------------------------------
# Expose data fixture helpers
# ---------------------------------------------------------------------------
from .fixtures import *  # noqa: F401,F403

# FIXME: Should this be imported in a shared location
# Stub heavy CLI components before importing individual commands
sys.modules.setdefault("gens.cli.load", types.ModuleType("gens.cli.load"))
base_stub: Any = types.ModuleType("gens.cli.base")
base_stub.cli = None
sys.modules.setdefault("gens.cli.base", base_stub)


class DummyDB(dict):
    """Simple dictionary based dummy database used in CLI tests."""

    def __getitem__(self, key):  # pragma: no cover - required for indexing
        return self


@pytest.fixture
def dummy_db() -> DummyDB:
    return DummyDB()
