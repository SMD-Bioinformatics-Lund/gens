"""Definition of fixtures, test data and dependency stubs."""

from __future__ import annotations

import sys
from typing import Any

from .fixtures import *  

gens_app_stub: Any = types.ModuleType("gens.app")
def _create_app():
    return None
gens_app_stub.create_app = _create_app
sys.modules.setdefault("gens.app", gens_app_stub)