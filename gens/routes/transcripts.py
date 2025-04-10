"""Transcript API routes"""

from fastapi import APIRouter

from gens.crud.genomic import get_chromosome_info
from gens.crud.transcripts import get_transcripts as crud_get_transcripts
from gens.models.annotation import TranscriptRecord
from gens.models.genomic import Chromosome, GenomeBuild, GenomicRegion
from .utils import ApiTags, GensDb
from .root import API_BASE_URL

router = APIRouter(prefix=f"{API_BASE_URL}/transcript", tags=[ApiTags.TRANSC])


@router.get("/track")
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