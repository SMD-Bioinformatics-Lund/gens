"""Transcript API routes"""

from fastapi import APIRouter, HTTPException

from gens.crud.genomic import get_chromosome_info
from gens.crud.transcripts import get_transcripts as crud_get_transcripts
from gens.models.annotation import TranscriptRecord
from gens.models.genomic import Chromosome, GenomeBuild
from .utils import ApiTags, GensDb

router = APIRouter(prefix="/transcript", tags=[ApiTags.TRANSC])


@router.get("/track")
async def get_transcripts(chromosome: Chromosome, genome_build: GenomeBuild, db: GensDb, start: int | None = 1, end: int | None = None) -> list[TranscriptRecord]:
    """Get transcripts for sample."""
    #raise HTTPException(status_code=400, detail=str(err)) from err
    
    # lookup end of chromosome if no end is defined and calculate zoom level
    start = start if start is not None else 1
    chrom_info = get_chromosome_info(db, chromosome, genome_build)

    # get transcript for the new region
    transcripts: list[TranscriptRecord] = crud_get_transcripts(chromosome, start, chrom_info.size , genome_build, db)
    return transcripts