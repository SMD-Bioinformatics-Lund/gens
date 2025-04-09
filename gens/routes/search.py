"""Routes for searching for different anntoations such as transcripts."""

from typing import Annotated
from fastapi import APIRouter, Query, HTTPException

from gens.crud.search import search_annotations
from gens.db.db import GensDb
from gens.models.genomic import GenomeBuild, GenomicRegion, Chromosome
from gens.models.search import SearchSuggestions


router = APIRouter(prefix="/sample")

QueryParam = Annotated[str, Query(alias='q')]


@router.get("/result")
def search(query: QueryParam, genome_build: GenomeBuild, db: GensDb) -> GenomicRegion:
    """Search for a annotation."""

    result = search_annotations(query=query, genome_build=genome_build, db=db)
    if result is None:
        raise HTTPException(status_code=404, detail="No result found!")
    return result


@router.get('/assistant')
def search_assistant(query: QueryParam, db: GensDb) -> SearchSuggestions:
    """Suggest hits."""

    return SearchSuggestions()