"""For get and modify genome annotation information.

When querying multiple annotations or transcripts a subeset of information is returned.
Query individual annotaions or transcript to get the full info.
"""

from http import HTTPStatus
from fastapi import APIRouter, HTTPException

from gens.crud.annotations import get_annotation, get_annotation_tracks, get_annotations_for_track
from gens.models.annotation import (
    AnnotationRecord,
    AnnotationTrackInDb,
    ReducedTrackInfo,
    TranscriptRecord,
)
from gens.models.genomic import GenomeBuild, Chromosome, GenomicRegion
from gens.models.base import PydanticObjectId
from gens.crud.genomic import get_chromosome_info
from gens.crud.transcripts import get_transcript, get_transcripts as crud_get_transcripts

from .utils import ApiTags, GensDb

router = APIRouter(prefix="/tracks")


@router.get("/annotations", tags=[ApiTags.ANNOT])
async def get_annotations_tracks(genome_build: GenomeBuild | None, db: GensDb) -> list[AnnotationTrackInDb]:
    """Get all avaliable annotation tracks."""
    tracks = get_annotation_tracks(db=db, genome_build=genome_build)
    return tracks


@router.get("/annotations/{track_id}", tags=[ApiTags.ANNOT])
async def get_annotation_track(
    track_id: PydanticObjectId, db: GensDb
) -> list[ReducedTrackInfo]:
    """Get annoations for a region."""
    return get_annotations_for_track(track_id=track_id, db=db)


@router.get("/annotations/annotation/{record_id}", tags=[ApiTags.ANNOT])
async def get_annotation_with_id(
    record_id: PydanticObjectId, db: GensDb
) -> AnnotationRecord:
    """Get annoations for a region."""
    result = get_annotation(record_id, db)
    if result is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND)
    return result


@router.get("/transcripts", tags=[ApiTags.TRANSC])
async def get_transcripts(
    chromosome: Chromosome,
    genome_build: GenomeBuild,
    db: GensDb,
    start: int | None = 1,
    end: int | None = None,
) -> list[ReducedTrackInfo]:
    """Get all transcripts for a sample.

    Return reduced information.
    """
    # lookup end of chromosome if no end is defined and calculate zoom level
    start = start if start is not None else 1
    if end is None:
        chrom_info = get_chromosome_info(db, chromosome, genome_build)
        end = chrom_info.size

    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    # get transcript for the new region
    transcripts: list[ReducedTrackInfo] = crud_get_transcripts(region, genome_build, db)
    return transcripts


@router.get("/transcripts/transcript/{transcript_id}", tags=[ApiTags.TRANSC])
async def get_transcript_with_id(
    transcript_id: PydanticObjectId, db: GensDb
) -> TranscriptRecord:
    """Query the database for a transcript and return the full info."""
    result = get_transcript(transcript_id, db)
    if result is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND)
    return result
