from __future__ import annotations

import sys
import types
from typing import Any

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
    def model_validate(cls, obj):  # type: ignore
        return cls.parse_obj(obj)

    pydantic.BaseModel.model_validate = classmethod(model_validate)  # type: ignore

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

# Adjust pydantic models to work without bson ObjectId validation
try:
    import gens.models.base as base_mod

    base_mod.PydanticObjectId = str  # type: ignore
    if hasattr(base_mod.RWModel, "Config"):
        base_mod.RWModel.Config.arbitrary_types_allowed = True  # type: ignore
    if hasattr(base_mod.RWModel, "__config__"):
        base_mod.RWModel.__config__.arbitrary_types_allowed = True  # type: ignore
except Exception:  # pragma: no cover - if models are unavailable
    pass
