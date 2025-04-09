"""Transcript related CRUD functions."""

from typing import Any
from pymongo.database import Database
from gens.models.annotation import TranscriptRecord
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.db.collections import TRANSCRIPTS_COLLECTION
from .utils import query_genomic_region


def get_transcripts(
    region: GenomicRegion,
    genome_build: GenomeBuild,
    db: Database[Any],
) -> list[TranscriptRecord]:
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
    projection: dict[str, bool] = {"_id": False}

    cursor = db.get_collection(TRANSCRIPTS_COLLECTION).find(
        query, projection, sort=sort_order
    )
    return [TranscriptRecord.model_validate(doc) for doc in cursor]
