# bson stub for ObjectId
# bson_stub: Any = types.ModuleType("bson")
# class _ObjectId:  # pragma: no cover
#     def __init__(self, *a, **k):
#         pass
# bson_stub.ObjectId = _ObjectId
# sys.modules.setdefault("bson", bson_stub)

# # Minimal requests stub for modules that expect it
# requests_stub: Any = types.ModuleType("requests")
# def _dummy_get(*a, **kw):  # pragma: no cover
#     class Resp:
#         status_code = 200
#         def json(self):
#             return {}
#     return Resp()
# requests_stub.get = _dummy_get
# sys.modules.setdefault("requests", requests_stub)

# # Stub for email_validator required by pydantic EmailStr
# sys.modules.setdefault("email_validator", types.ModuleType("email_validator"))