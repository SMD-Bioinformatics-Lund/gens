from http import HTTPStatus
from fastapi import APIRouter, HTTPException

from gens.crud.sample_annotations import (
    get_sample_annotation_tracks,
    get_sample_annotations,
    get_sample_annotations_for_track,
)
from gens.models.annotation import SimplifiedTrackInfo
from gens.models.base import PydanticObjectId
from gens.models.genomic import Chromosome, GenomeBuild
from gens.models.sample_annotation import SampleAnnotationRecord, SampleAnnotationTrackInDb
from gens.routes.utils import ApiTags, GensDb


router = APIRouter(prefix="/sample-tracks")


@router.get("/annotations", tags=[ApiTags.SAMPLE_ANNOT])
async def get_sample_annotation_tracks_route(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild | None,
    db: GensDb,
) -> list[SampleAnnotationTrackInDb]:
    """Get sample specific annotation tracks"""
    return get_sample_annotation_tracks(
        genome_build=genome_build, db=db, sample_id=sample_id, case_id=case_id
    )


@router.get("/annotations/track/{track_id}", tags=[ApiTags.SAMPLE_ANNOT])
async def get_sample_annotations_route(
    track_id: PydanticObjectId, chromosome: Chromosome, db: GensDb
) -> list[SimplifiedTrackInfo]:
    return get_sample_annotations_for_track(track_id=track_id, chromosome=chromosome, db=db)


@router.get("/annotations/record/{record_id}", tags=[ApiTags.SAMPLE_ANNOT])
async def get_sample_annotation_record_route(
    record_id: PydanticObjectId, db: GensDb,
) -> SampleAnnotationRecord:
    result = get_sample_annotations(record_id, db)
    if result is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND)
    return result
