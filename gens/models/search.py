"""Models for searching."""

from typing import Any

from pydantic import BaseModel

from gens.models.base import PydanticObjectId


class Suggestion(BaseModel):
    """A search suggestion."""

    record_id: PydanticObjectId
    text: str
    score: float


class SearchSuggestions(BaseModel):
    """Suggest results."""

    transcript_suggestion: list[Suggestion] = []
    annotation_suggestion: list[Suggestion] = []
