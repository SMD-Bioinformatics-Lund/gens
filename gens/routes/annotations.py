"""For get and modify genome annotation information.

When querying multiple annotations or transcripts a subeset of information is returned.
Query individual annotaions or transcript to get the full info.
"""

from http import HTTPStatus
from fastapi import APIRouter, HTTPException

from gens.constants import MANE_PLUS_CLINICAL, MANE_SELECT
from gens.crud.annotations import get_annotation, get_annotation_tracks, get_annotations_for_track
from gens.models.annotation import (
    AnnotationRecord,
    AnnotationTrackInDb,
    SimplifiedTrackInfo,
    SimplifiedTranscriptInfo,
    SimplifiedVariantRecord,
    TranscriptRecord,
    VariantRecord,
)
from gens.models.genomic import (
    ChromInfo,
    GenomeBuild,
    Chromosome,
    GenomicRegion,
    ReducedChromInfo,
    VariantCategory,
)
from gens.models.base import PydanticObjectId
from gens.crud.genomic import get_chromosome_info, get_chromosomes
from gens.crud.transcripts import get_transcript, get_transcripts as crud_get_transcripts
from gens.crud.scout import VariantNotFoundError, VariantValidaitonError, get_variant, get_variants as get_variants_from_scout

from .utils import ApiTags, GensDb, ScoutDb

router = APIRouter(prefix="/tracks")


@router.get("/annotations", tags=[ApiTags.ANNOT], response_model_by_alias=False)
async def get_annotations_tracks(
    genome_build: GenomeBuild | None, db: GensDb
) -> list[AnnotationTrackInDb]:
    """Get all avaliable annotation tracks."""
    tracks = get_annotation_tracks(db=db, genome_build=genome_build)
    return tracks


@router.get("/annotations/{track_id}", tags=[ApiTags.ANNOT])
async def get_annotation_track(track_id: PydanticObjectId, db: GensDb) -> list[SimplifiedTrackInfo]:
    """Get annotations for a region."""
    return get_annotations_for_track(track_id=track_id, db=db)


@router.get("/annotations/{record_id}", tags=[ApiTags.ANNOT])
async def get_annotation_with_id(record_id: PydanticObjectId, db: GensDb) -> AnnotationRecord:
    """Get annotations for a region."""
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
    only_mane: bool = False,
) -> list[SimplifiedTranscriptInfo]:
    """Get all transcripts for a genomic region.

    Returns a list of simplified transcript records. Use query parameters to filter by region or type.
    """
    # lookup end of chromosome if no end is defined and calculate zoom level
    start = start if start is not None else 1
    if end is None:
        chrom_info = get_chromosome_info(db, chromosome, genome_build)
        if chrom_info is None:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail=f"No information on chromosome: {chromosome}",
            )
        end = chrom_info.size

    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    # get transcript for the new region
    transcripts: list[SimplifiedTranscriptInfo] = crud_get_transcripts(region, genome_build, db)
    if only_mane:
        transcripts = [tr for tr in transcripts if tr.type in {MANE_SELECT, MANE_PLUS_CLINICAL}]
    return transcripts


@router.get("/transcripts/{transcript_id}", tags=[ApiTags.TRANSC])
async def get_transcript_with_id(transcript_id: PydanticObjectId, db: GensDb) -> TranscriptRecord:
    """Get a single transcript by its unique ID.

    Returns the full transcript record with all available details.
    """
    result = get_transcript(transcript_id, db)
    if result is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND)
    return result


@router.get("/chromosomes/", tags=[ApiTags.CHROM])
async def get_chromosomes_with_build(
    genome_build: GenomeBuild, db: GensDb
) -> list[ReducedChromInfo]:
    """Query the database for all chromosomes with a given genome build."""
    chroms = get_chromosomes(db, genome_build)
    return chroms


@router.get("/chromosomes/{chromosome}", tags=[ApiTags.CHROM])
async def get_chromosome_with_build(
    chromosome: Chromosome, genome_build: GenomeBuild, db: GensDb
) -> ChromInfo:
    """Query the database for a chromosome."""
    chrom_info = get_chromosome_info(db, chromosome, genome_build)
    if chrom_info is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND)
    return chrom_info


@router.get("/variants", tags=[ApiTags.VAR])
async def get_variants(
    sample_id: str,
    case_id: str,
    chromosome: Chromosome,
    category: VariantCategory,
    db: ScoutDb,
    start: int = 1,
    end: int | None = None,
) -> list[SimplifiedVariantRecord]:
    """Get all variants for a genomic region.

    Returns a list of simplified variant records. Use query parameters to filter by region or type.
    """
    region = GenomicRegion(chromosome=chromosome, start=start, end=end)
    try:
        variants = get_variants_from_scout(
            sample_name=sample_id, case_id=case_id, region=region, variant_category=category, gt=gt, db=db
        )
    except VariantValidaitonError as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e)
        )
    return variants


@router.get("/variants/{variant_id}", tags=[ApiTags.VAR])
async def get_variant_with_id(
    variant_id: str,
    db: ScoutDb,
) -> VariantRecord:
    """Get a single variant by its unique ID.

    Returns the full variant record from Scout with all available details.
    """
    try:
        variant = get_variant(variant_id, db=db)
    except VariantValidaitonError as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(e)
        )
    except VariantNotFoundError:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=f"Variant {variant_id} not found")
    return variant
