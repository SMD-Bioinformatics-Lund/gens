"""Definition of fixtures, test data and dependency stubs."""

from __future__ import annotations

import sys
import types
from typing import Any

# ---------------------------------------------------------------------------
# Stub out optional third party modules that are not available in the
# execution environment used for the tests.  Only minimal functionality
# required for module imports is provided.
# ---------------------------------------------------------------------------

# Flask and related utilities
flask_stub: Any = types.ModuleType("flask")

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

flask_stub.Flask = _Flask
flask_stub.redirect = _redirect
flask_stub.request = _Request()
flask_stub.url_for = _url_for
sys.modules.setdefault("flask", flask_stub)
flask_cli_stub: Any = types.ModuleType("flask.cli")
class _FlaskGroup:  # pragma: no cover
    def __init__(self, *a, **kw):
        pass
    def add_command(self, *a, **kw):
        pass
flask_cli_stub.FlaskGroup = _FlaskGroup
sys.modules.setdefault("flask.cli", flask_cli_stub)

# flask_compress
compress_stub: Any = types.ModuleType("flask_compress")
class _Compress:  # pragma: no cover
    def init_app(self, app) -> None:
        pass
compress_stub.Compress = _Compress
sys.modules.setdefault("flask_compress", compress_stub)

# flask_login
flask_login_stub: Any = types.ModuleType("flask_login")
class _LoginManager:  # pragma: no cover
    def init_app(self, app) -> None:
        pass
flask_login_stub.LoginManager = _LoginManager
flask_login_stub.current_user = types.SimpleNamespace(is_authenticated=False)
flask_login_stub.UserMixin = object
sys.modules.setdefault("flask_login", flask_login_stub)

# authlib OAuth client
authlib_fc_stub: Any = types.ModuleType("authlib.integrations.flask_client")
class _OAuth:  # pragma: no cover
    def init_app(self, app) -> None:
        pass
    def register(self, *a, **kw) -> None:
        pass
authlib_fc_stub.OAuth = _OAuth
sys.modules.setdefault("authlib", types.ModuleType("authlib"))
sys.modules.setdefault("authlib.integrations", types.ModuleType("authlib.integrations"))
sys.modules.setdefault("authlib.integrations.flask_client", authlib_fc_stub)

# werkzeug response
werk_resp_stub: Any = types.ModuleType("werkzeug.wrappers.response")
class _Response:  # pragma: no cover
    pass
werk_resp_stub.Response = _Response
sys.modules.setdefault("werkzeug", types.ModuleType("werkzeug"))
sys.modules.setdefault("werkzeug.wrappers", types.ModuleType("werkzeug.wrappers"))
sys.modules.setdefault("werkzeug.wrappers.response", werk_resp_stub)

# asgiref
asgiref_wsgi_stub: Any = types.ModuleType("asgiref.wsgi")
class _WsgiToAsgi:  # pragma: no cover
    def __init__(self, app) -> None:
        self.app = app
asgiref_wsgi_stub.WsgiToAsgi = _WsgiToAsgi
sys.modules.setdefault("asgiref", types.ModuleType("asgiref"))
sys.modules.setdefault("asgiref.wsgi", asgiref_wsgi_stub)

# pymongo stubs
pymongo_stub: Any = types.ModuleType("pymongo")
pymongo_stub.ASCENDING = 1
pymongo_stub.DESCENDING = -1
class _IndexModel:  # pragma: no cover
    def __init__(self, *a, **kw) -> None:
        self.document = kw
pymongo_stub.IndexModel = _IndexModel
pymongo_stub.TEXT = "text"
pymongo_stub.MongoClient = object
sys.modules.setdefault("pymongo", pymongo_stub)
pymongo_database_stub: Any = types.ModuleType("pymongo.database")
class _Database:
    @classmethod
    def __class_getitem__(cls, item):  # pragma: no cover
        return cls

pymongo_database_stub.Database = _Database
sys.modules.setdefault("pymongo.database", pymongo_database_stub)
pymongo_collection_stub: Any = types.ModuleType("pymongo.collection")
class _Collection:
    @classmethod
    def __class_getitem__(cls, item):  # pragma: no cover
        return cls

pymongo_collection_stub.Collection = _Collection
sys.modules.setdefault("pymongo.collection", pymongo_collection_stub)
pymongo_cursor_stub: Any = types.ModuleType("pymongo.cursor")
class _Cursor:
    pass
pymongo_cursor_stub.Cursor = _Cursor
sys.modules.setdefault("pymongo.cursor", pymongo_cursor_stub)
pymongo_errors_stub: Any = types.ModuleType("pymongo.errors")
class _DuplicateKeyError(Exception):
    pass
pymongo_errors_stub.DuplicateKeyError = _DuplicateKeyError
sys.modules.setdefault("pymongo.errors", pymongo_errors_stub)

pymongo_uri_stub: Any = types.ModuleType("pymongo.uri_parser")
def _parse_uri(uri: str) -> dict[str, str | None]:  # pragma: no cover
    return {"database": None}
pymongo_uri_stub.parse_uri = _parse_uri
sys.modules.setdefault("pymongo.uri_parser", pymongo_uri_stub)

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

# pydantic_settings stub
pydantic_settings_stub: Any = types.ModuleType("pydantic_settings")
pydantic_settings_stub.BaseSettings = object
pydantic_settings_stub.PydanticBaseSettingsSource = object
pydantic_settings_stub.SettingsConfigDict = dict

class _TomlConfigSettingsSource:  # pragma: no cover
    def __init__(self, *a, **k):
        pass

pydantic_settings_stub.TomlConfigSettingsSource = _TomlConfigSettingsSource
sys.modules.setdefault("pydantic_settings", pydantic_settings_stub)

# pydantic_extra_types stub
pydantic_extra_stub: Any = types.ModuleType("pydantic_extra_types.color")
class _Color:  # pragma: no cover
    def __init__(self, *a, **k):
        pass
pydantic_extra_stub.Color = _Color
sys.modules.setdefault("pydantic_extra_types", types.ModuleType("pydantic_extra_types"))
sys.modules.setdefault("pydantic_extra_types.color", pydantic_extra_stub)

# bson stub for ObjectId
bson_stub: Any = types.ModuleType("bson")
class _ObjectId:  # pragma: no cover
    def __init__(self, *a, **k):
        pass
bson_stub.ObjectId = _ObjectId
sys.modules.setdefault("bson", bson_stub)

# pydantic_core stub for BaseModel support
pydantic_core_stub: Any = types.ModuleType("pydantic_core")
core_schema_stub = types.SimpleNamespace(CoreSchema=object)
def _union_schema(*args, **kwargs):
    return object
def _to_string_ser_schema(*args, **kwargs):
    return object
core_schema_stub.union_schema = _union_schema
core_schema_stub.to_string_ser_schema = _to_string_ser_schema
pydantic_core_stub.core_schema = core_schema_stub
class _PydanticCustomError(Exception):
    pass
pydantic_core_stub.PydanticCustomError = _PydanticCustomError
sys.modules.setdefault("pydantic_core", pydantic_core_stub)

# Minimal requests stub for modules that expect it
requests_stub: Any = types.ModuleType("requests")
def _dummy_get(*a, **kw):  # pragma: no cover
    class Resp:
        status_code = 200
        def json(self):
            return {}
    return Resp()
requests_stub.get = _dummy_get
sys.modules.setdefault("requests", requests_stub)

# Stub for email_validator required by pydantic EmailStr
sys.modules.setdefault("email_validator", types.ModuleType("email_validator"))

# ---------------------------------------------------------------------------
# Stub gens application factory to avoid heavy dependencies when importing the
# package during tests.
# ---------------------------------------------------------------------------
gens_app_stub: Any = types.ModuleType("gens.app")
def _create_app():  # pragma: no cover
    return None
gens_app_stub.create_app = _create_app
sys.modules.setdefault("gens.app", gens_app_stub)

# Minimal settings object used by the CLI
settings_module: Any = types.ModuleType("gens.config")
class _DBConf:
    def __init__(self):
        self.connection = "mongodb://localhost:27017"
        self.database = "gens-test"

class _Settings:
    def __init__(self):
        self.gens_db = _DBConf()
        self.scout_db = _DBConf()

settings_module.settings = _Settings()
sys.modules.setdefault("gens.config", settings_module)

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
