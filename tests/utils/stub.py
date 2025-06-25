from __future__ import annotations

import sys
from types import ModuleType
import importlib.util
from typing import Optional


def register_stub(name: str, attrs: dict[str, object] | None = None) -> Optional[ModuleType]:
    """Register a minimal module stub in ``sys.modules``.

    Parameters
    ----------
    name:
        Dotted name of the module to register.
    attrs:
        Optional mapping of attribute names to assign on the module.

    Parent modules will be created automatically for nested names.
    """
    parts = name.split(".")
    module_name = ""
    parent = None
    for i, part in enumerate(parts):
        module_name = part if not module_name else f"{module_name}.{part}"
        module = sys.modules.get(module_name)
        if module is None:
            if i == 0 and importlib.util.find_spec(module_name) is not None:
                # Real package exists; defer creation until imported
                module = None
            else:
                module = ModuleType(module_name)
                sys.modules[module_name] = module
                if parent is not None:
                    setattr(parent, part, module)
        parent = module
    if parent is not None:
        for key, value in (attrs or {}).items():
            setattr(parent, key, value)
    return parent
