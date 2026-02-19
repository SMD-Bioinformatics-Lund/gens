"""API root."""

from http import HTTPStatus
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi.encoders import jsonable_encoder

from gens.__version__ import VERSION as version
from gens.crud.search import search_annotations_and_transcripts, text_search_suggestion
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.models.search import SearchSuggestions

from .utils import ApiTags, GensDb

SearchQueryParam = Annotated[str, Query(alias="q")]

router = APIRouter()


@router.get("")
@router.get("/")
async def read_root():
    """Root welcome message."""
    return {
        "message": "Welcome to Gens API",
        "version": version,
    }


@router.get("/search/result", tags=[ApiTags.SEARCH])
def search(
    query: SearchQueryParam,
    genome_build: GenomeBuild,
    db: GensDb,
    annotation_track_ids: str | None = Query(None),
) -> GenomicRegion:
    """Search for a annotation."""

    track_ids: list[ObjectId] | None = None
    if annotation_track_ids:
        track_ids = [ObjectId(tid) for tid in annotation_track_ids.split(",") if tid]

    result = search_annotations_and_transcripts(
        query=query, genome_build=genome_build, db=db, annotation_track_ids=track_ids
    )
    if result is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="No result found!")
    return result


@router.get("/search/assistant", tags=[ApiTags.SEARCH])
def search_assistant(
    query: SearchQueryParam, genome_build: GenomeBuild, db: GensDb
) -> SearchSuggestions:
    """Suggest hits."""
    result = text_search_suggestion(query, genome_build, db)
    return jsonable_encoder(result)
