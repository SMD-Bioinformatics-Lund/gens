"""API root."""


from typing import Annotated
from fastapi import APIRouter, Query, HTTPException
from http import HTTPStatus

from gens.crud.search import search_annotations
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.models.search import SearchSuggestions
from typing import Annotated
from fastapi import APIRouter, Query
from gens import version
from .utils import ApiTags, GensDb

SearchQueryParam = Annotated[str, Query(alias='q')]

router = APIRouter()

@router.get("/")
async def read_root():
    """Root welcome message."""
    return {
        "message": "Welcome to Gens API",
        "version": version,
    }


@router.get("/search/result", tags=[ApiTags.SEARCH])
def search(query: SearchQueryParam, genome_build: GenomeBuild, db: GensDb) -> GenomicRegion:
    """Search for a annotation."""

    result = search_annotations(query=query, genome_build=genome_build, db=db)
    if result is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="No result found!")
    return result


@router.get('/search/assistant', tags=[ApiTags.SEARCH])
def search_assistant(query: SearchQueryParam, db: GensDb) -> SearchSuggestions:
    """Suggest hits."""

    raise HTTPException(status_code=HTTPStatus.NOT_IMPLEMENTED)

    return SearchSuggestions()