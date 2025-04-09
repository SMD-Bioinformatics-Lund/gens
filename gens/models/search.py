"""Models for searching."""


from pydantic import BaseModel


class SearchSuggestions(BaseModel):
    """Suggest results."""
    autocomplete_suggestion: list[str] = []
    transcript_suggestion: list[str] = []
    annotation_suggestion: list[str] = []