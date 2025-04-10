"""For get and modify genome annotation information."""

from fastapi import APIRouter

from gens.crud.annotations import get_annotation_tracks, get_track
from gens.db.db import get_db
from gens.models.annotation import AnnotationTrackInDb
from gens.models.genomic import GenomeBuild
from gens.models.base import PydanticObjectId

from .utils import ApiTags, GensDb

router = APIRouter(prefix="/annotation")

@router.get("/", tags=[ApiTags.ANNOT])
async def get_tracks(
    genome_build: GenomeBuild,
    db: GensDb
    ):
    """Get all avaliable annotation tracks."""
    tracks = get_annotation_tracks(db=db, genome_build=genome_build)
    return tracks


@router.get("/track", tags=[ApiTags.ANNOT])
async def get_annotation_track(id: PydanticObjectId, db: GensDb) -> AnnotationTrackInDb:
    """Get annoations for a region."""
    return get_track(track_id=id, db=db)