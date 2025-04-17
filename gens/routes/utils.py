"""Shared support functions and data."""

from enum import StrEnum
from typing import Annotated, Any

from fastapi import Depends
from pymongo.database import Database

from gens.db.db import get_gens_db, get_scout_db

GensDb = Annotated[Database[Any], Depends(get_gens_db)]

ScoutDb = Annotated[Database[Any], Depends(get_scout_db)]


class ApiTags(StrEnum):
    SAMPLE = "sample"
    CHROM = "chromosome"
    ANNOT = "annotation"
    TRANSC = "transcript"
    AUTH = "authentication"
    SEARCH = "search"
    USER = "user"
    VAR = "variant"