from __future__ import annotations

import sys
import types
from typing import Any


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