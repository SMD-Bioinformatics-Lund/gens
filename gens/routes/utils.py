"""Shared support functions and data."""

from enum import StrEnum
from typing import Annotated, Any

from fastapi import Depends
from pymongo.database import Database

from gens.adapters.base import InterpretationAdapter
from gens.db.db import get_gens_db, get_variant_software_adapter

GensDb = Annotated[Database[Any], Depends(get_gens_db)]
AdapterDep = Annotated[InterpretationAdapter, Depends(get_variant_software_adapter)]


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
    GENE_LIST = "gene-list"
