"""API root."""


from typing import Annotated
from fastapi import APIRouter, Query, HTTPException
from http import HTTPStatus

from gens.crud.search import search_annotations
from gens.crud.user import get_users as crud_get_users
from gens.crud.user import get_user as crud_get_user
from gens.crud.user import create_user as crud_create_user
from gens.db.collections import USER_COLLECTION
from gens.models.base import User
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


@router.get('/users', tags=[ApiTags.USER])
def get_users(db: GensDb) -> list[User]:
    """Get all users in the database."""

    user_col = db.get_collection(USER_COLLECTION)
    return crud_get_users(user_col)


@router.get('/users/user', tags=[ApiTags.USER])
def get_user(username: str, db: GensDb) -> User: # type: ignore
    user_col = db.get_collection(USER_COLLECTION)
    crud_get_user(user_col, username)


@router.post('/users/user', tags=[ApiTags.USER], status_code=HTTPStatus.CREATED)
def create_user(user_data: User, db: GensDb):
    user_col = db.get_collection(USER_COLLECTION)
    crud_create_user(user_col, user_data)