"""Transcript related CRUD functions."""

import logging
from typing import Any

from pymongo.database import Database

from gens.crud.annotations import register_data_update
from gens.db.collections import TRANSCRIPTS_COLLECTION
from gens.models.annotation import SimplifiedTranscriptInfo, TranscriptRecord
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild, GenomePosition, GenomicRegion

from .utils import query_genomic_region

LOG = logging.getLogger(__name__)


def _format_features(features: list[dict[str, Any]]) -> list[GenomePosition]:
    """Format a transcript features."""
    return [GenomePosition(start=int(feat['start']), end=int(feat['end'])) for feat in features]


def get_transcripts(
    region: GenomicRegion,
    genome_build: GenomeBuild,
    db: Database[Any],
) -> list[SimplifiedTranscriptInfo]:
    """Get transcript information from the database."""
    # build base query
    if region.start is None or region.end is None:
        raise ValueError("Start and end coordinates must be set.")

    query: dict[str, Any] = {
        "chrom": region.chromosome,
        "genome_build": genome_build,
        **query_genomic_region(region.start, region.end),
    }
    # build sort order
    sort_order: list[tuple[str, int]] = [("start", 1), ("height_order", 1)]

    projection: dict[str, bool] = {
        "gene_name": True,
        "start": True,
        "end": True,
        "mane": True,
        "features": True,
    }
    cursor = db.get_collection(TRANSCRIPTS_COLLECTION).find(
        query, projection, sort=sort_order
    )
    return [
        SimplifiedTranscriptInfo.model_validate(
            {
                "record_id": doc["_id"],
                "name": doc["gene_name"],
                "start": doc["start"],
                "end": doc["end"],
                "type": doc["mane"] if doc["mane"] is not None else "non-mane",
                "features": _format_features(doc["features"]),
            }
        )
        for doc in cursor
    ]


def get_transcript(
    transcript_id: PydanticObjectId, db: Database[Any]
) -> TranscriptRecord | None:
    """Get transcript with id."""
    resp = db.get_collection(TRANSCRIPTS_COLLECTION).find_one({"_id": transcript_id})
    if resp is not None:
        return TranscriptRecord.model_validate(resp)
    return None


def create_transcripts(transcripts: list[TranscriptRecord], db: Database[Any]):
    """Insert many transcripts in the database."""

    LOG.info("Add transcripts to database")
    db.get_collection(TRANSCRIPTS_COLLECTION).insert_many(
        [tr.model_dump() for tr in transcripts]
    )
    register_data_update(db, TRANSCRIPTS_COLLECTION)
