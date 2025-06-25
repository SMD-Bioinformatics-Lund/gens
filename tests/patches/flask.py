import json
import sys
import types
from typing import Any



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
flask_stub.json = json
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