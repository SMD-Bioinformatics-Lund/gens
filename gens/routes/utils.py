"""Shared support functions and data."""

from enum import StrEnum
from typing import Annotated, Any

from fastapi import Depends
from pymongo.database import Database

from gens.db.db import get_db


GensDb = Annotated[Database[Any], Depends(get_db)]


class ApiTags(StrEnum):
    SAMPLE = "sample"
    ANNOT = "annotation"
    TRANSC = "transcript"
    AUTH = "authentication"


class ScatterDataType(StrEnum):
    COV = "coverage"
    BAF = "baf"
