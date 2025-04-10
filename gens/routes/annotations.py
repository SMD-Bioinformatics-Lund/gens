"""For get and modify genome annotation information."""

from fastapi import APIRouter

from gens.crud.annotations import get_annotation_tracks, get_track
from gens.models.annotation import AnnotationTrackInDb, TranscriptRecord
from gens.models.genomic import GenomeBuild, Chromosome, GenomicRegion
from gens.models.base import PydanticObjectId
from gens.crud.genomic import get_chromosome_info
from gens.crud.transcripts import get_transcripts as crud_get_transcripts

from .utils import ApiTags, GensDb

router = APIRouter(prefix="/tracks")

@router.get("/annotation/sources", tags=[ApiTags.ANNOT])
async def get_tracks(
    genome_build: GenomeBuild,
    db: GensDb
    ):
    """Get all avaliable annotation tracks."""
    tracks = get_annotation_tracks(db=db, genome_build=genome_build)
    return tracks


@router.get("/annotation", tags=[ApiTags.ANNOT])
async def get_annotation_track(id: PydanticObjectId, db: GensDb) -> AnnotationTrackInDb:
    """Get annoations for a region."""
    return get_track(track_id=id, db=db)


@router.get("/transcript", tags=[ApiTags.TRANSC])
async def get_transcripts(chromosome: Chromosome, genome_build: GenomeBuild, db: GensDb, start: int | None = 1, end: int | None = None) -> list[TranscriptRecord]:
    """Get transcripts for sample."""
    # lookup end of chromosome if no end is defined and calculate zoom level
    start = start if start is not None else 1
    if end is None:
        chrom_info = get_chromosome_info(db, chromosome, genome_build)
        end = chrom_info.size
    
    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    # get transcript for the new region
    transcripts: list[TranscriptRecord] = crud_get_transcripts(region, genome_build, db)
    return transcripts