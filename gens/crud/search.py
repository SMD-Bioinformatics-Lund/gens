"""Functions realted to searching for annotations and suggesting results."""

import logging
import re
from typing import Any

from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.cursor import Cursor

from gens.db.collections import ANNOTATIONS_COLLECTION, TRANSCRIPTS_COLLECTION
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.models.search import SearchSuggestions, Suggestion

LOG = logging.getLogger(__name__)


def search_annotations_and_transcripts(
    query: str, genome_build: GenomeBuild, db: Database[Any]
) -> GenomicRegion | None:
    """Simple search for annotations and transcripts."""
    db_query: dict[str, Any] = {
        "gene_name": re.compile(r"^" + re.escape(query) + r"$", re.IGNORECASE),
        "genome_build": genome_build,
    }

    for col in [TRANSCRIPTS_COLLECTION, ANNOTATIONS_COLLECTION]:
        elements = list(
            db.get_collection(col).find(db_query, sort=[("start", 1), ("chrom", 1)])
        )
        if len(elements) > 0:
            LOG.error("Found elements", elements)

            elements_with_mane = [elem for elem in elements if elem.get("mane") is not None]

            target = elements[0]
            if len(elements_with_mane) > 0:
                target = elements_with_mane[0]


            # start_elem = elements[0]
            # end_elem = max(elements[0:], key=lambda elem: elem.get("end"))
            return GenomicRegion.model_validate(
                {
                    "chromosome": target.get("chrom"),
                    "start": target.get("start"),
                    "end": target.get("end"),
                }
            )
    return None


def text_search_suggestion(
    query: str, genome_build: GenomeBuild, db: Database[Any]
) -> SearchSuggestions:
    """Query the database and suggest entries."""
    # annotation searches
    annot_hits = generic_text_search(
        query=query,
        genome_build=genome_build,
        collection=db.get_collection(ANNOTATIONS_COLLECTION),
        projection={"name": True}
    )
    annotations = [
        Suggestion(text=hit["name"], record_id=hit["_id"], score=hit["score"])
        for hit in annot_hits
    ]
    transc_hits = generic_text_search(
        query=query,
        genome_build=genome_build,
        collection=db.get_collection(TRANSCRIPTS_COLLECTION),
        projection={"gene_name": True}
    )
    transc = [
        Suggestion(text=hit["gene_name"], record_id=hit["_id"], score=hit["score"])
        for hit in transc_hits
    ]
    return SearchSuggestions(
        annotation_suggestion=annotations,
        transcript_suggestion=transc,
    )


def generic_text_search(
    query: str, genome_build: GenomeBuild, collection: Collection[Any],
    limit: int = 10, projection: dict[str, bool] = {}
) -> Cursor[dict[str, Any]]:
    """Make a text search against a generic collection."""
    result_projection: dict[str, Any] = {
        "score": {"$meta": "textScore"},
        **projection
    }
    results = collection.find(
        {"genome_build": genome_build, "$text": {"$search": query}},
        result_projection
    ).sort({"score": {"$meta": "textScore"}}).limit(limit)
    return results