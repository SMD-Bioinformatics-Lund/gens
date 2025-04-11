"""Transcript related CRUD functions."""

import logging
from typing import Any
from pymongo.database import Database
from gens.crud.annotations import register_data_update
from gens.models.annotation import TranscriptRecord, ReducedTrackInfo
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.db.collections import TRANSCRIPTS_COLLECTION
from .utils import query_genomic_region


LOG = logging.getLogger(__name__)


def get_transcripts(
    region: GenomicRegion,
    genome_build: GenomeBuild,
    db: Database[Any],
) -> list[ReducedTrackInfo]:
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

    cursor = db.get_collection(TRANSCRIPTS_COLLECTION).find(
        query, sort=sort_order
    )
    return [
        ReducedTrackInfo.model_validate(
            {
                "record_id": doc["_id"],
                "name": doc["gene_name"],
                "start": doc["start"],
                "end": doc["end"],
                "type": doc["mane"] if doc["mane"] is not None else "non-mane",
            }
        )
        for doc in cursor
    ]


def get_transcript(transcript_id: PydanticObjectId, db: Database[Any]) -> TranscriptRecord | None:
    """Get transcript with id."""
    resp = db.get_collection(TRANSCRIPTS_COLLECTION).find_one({"_id": transcript_id})
    if resp is not None:
        return TranscriptRecord.model_validate(resp)
    

def create_transcripts(transcripts: list[TranscriptRecord], db: Database[Any]):
    """Insert many transcripts in the database."""

    LOG.info("Add transcripts to database")
    db.get_collection(TRANSCRIPTS_COLLECTION).insert_many(
        [tr.model_dump() for tr in transcripts]
    )
    register_data_update(db, TRANSCRIPTS_COLLECTION)
