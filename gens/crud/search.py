"""Functions realted to searching for annotations and suggesting results."""

import logging
import re
from typing import Any, Iterable

from bson import ObjectId
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.cursor import Cursor

from gens.db.collections import ANNOTATIONS_COLLECTION, TRANSCRIPTS_COLLECTION
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.models.search import SearchSuggestions, Suggestion

LOG = logging.getLogger(__name__)


def search_annotations_and_transcripts(
    query: str,
    genome_build: GenomeBuild,
    db: Database[Any],
    annotation_track_ids: Iterable[ObjectId] | None = None,
) -> GenomicRegion | None:
    """Simple search for annotations and transcripts."""
    transcript_query: dict[str, Any] = {
        "gene_name": re.compile(r"^" + re.escape(query) + r"$", re.IGNORECASE),
        "genome_build": genome_build,
    }

    # Transcripts
    transcripts = list(
        db.get_collection(TRANSCRIPTS_COLLECTION).find(
            transcript_query, sort=[("start", 1), ("chrom", 1)]
        )
    )
    LOG.info(">>> Direct matched elements %s", transcripts)
    if len(transcripts) > 0:
        LOG.info(">>> Inside the if")

        elements_with_mane = [elem for elem in transcripts if elem.get("mane") is not None]

        target = transcripts[0]
        if len(elements_with_mane) > 0:
            target = elements_with_mane[0]

        return GenomicRegion.model_validate(
            {
                "chromosome": target.get("chrom"),
                "start": target.get("start"),
                "end": target.get("end"),
            }
        )

    LOG.info(">>> After the if")

    annotation_query: dict[str, Any] = {
        "name": {"$regex": re.escape(query), "$options": "i"},
        "genome_build": genome_build,
    }

    if annotation_track_ids:
        annotation_query["track_id"] = {"$in": list(annotation_track_ids)}

    annotations = list(
        db.get_collection(ANNOTATIONS_COLLECTION).find(
            annotation_query, sort=[("start", 1), ("chrom", 1)]
        )
    )

    LOG.info(">>> Found annotations %s", annotations)
    if len(annotations) > 0:
        target = annotations[0]

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
        projection={"name": True},
    )
    annotations = [
        Suggestion(text=hit["name"], record_id=hit["_id"], score=hit["score"]) for hit in annot_hits
    ]
    transc_hits = generic_text_search(
        query=query,
        genome_build=genome_build,
        collection=db.get_collection(TRANSCRIPTS_COLLECTION),
        projection={"gene_name": True},
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
    query: str,
    genome_build: GenomeBuild,
    collection: Collection[Any],
    limit: int = 10,
    projection: dict[str, bool] = {},
) -> Cursor[dict[str, Any]]:
    """Make a text search against a generic collection."""
    result_projection: dict[str, Any] = {"score": {"$meta": "textScore"}, **projection}
    results = (
        collection.find(
            {"genome_build": genome_build, "$text": {"$search": query}}, result_projection
        )
        .sort({"score": {"$meta": "textScore"}})
        .limit(limit)
    )
    return results
