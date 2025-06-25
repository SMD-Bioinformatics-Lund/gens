from __future__ import annotations

import sys
import types
from typing import Any

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