"""Shared support functions and data."""

from enum import StrEnum
from typing import Annotated, Any

from fastapi import Depends
from pymongo.database import Database

# from gens.adapters.scout import ScoutAdapter
from gens.adapters.base import InterpretationAdapter
from gens.db.db import get_gens_db, get_variant_software_adapter

GensDb = Annotated[Database[Any], Depends(get_gens_db)]

# FIXME: Needed for FastAPI types to work
AdapterDep = Annotated[InterpretationAdapter, Depends(get_variant_software_adapter)]

# ScoutDb = Annotated[Database[Any], Depends(get_scout_db)]

# ScoutAdapterDep = Annotated[ScoutAdapter, Depends(get_scout_adapter)]


class ApiTags(StrEnum):
    SAMPLE = "sample"
    CHROM = "chromosome"
    ANNOT = "annotation"
    TRANSC = "transcript"
    AUTH = "authentication"
    SEARCH = "search"
    USER = "user"
    VAR = "variant"
    SAMPLE_ANNOT = "sample-annotation"
