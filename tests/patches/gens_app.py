
from __future__ import annotations

import sys
import types
from typing import Any

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

base_stub: Any = types.ModuleType("gens.cli.base")
base_stub.cli = None
sys.modules.setdefault("gens.cli.base", base_stub)

# # FIXME: Move this part to chromosome test?
# class _DummyChrom:
#     def model_dump(self) -> dict[str, str]:  # pragma: no cover - simple stub
#         return {"chrom": "1"}

# def _fake_build_chromosomes_obj(*args, **kwargs):  # pragma: no cover - simple stub
#     return [_DummyChrom()]

# try:
#     import gens.load.chromosomes as chrom_mod

#     chrom_mod.build_chromosomes_obj = _fake_build_chromosomes_obj
# except Exception:
#     pass

