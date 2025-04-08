"""Related to manual annotation info."""

from typing import Any
from pymongo.database import Database

from gens.models.annotation import AnnotationTrackInDb
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild
from .collections import ANNOTATIONS_COLLECTION


def get_annotation_tracks(genome_build: GenomeBuild, db: Database[Any]) -> list[str]:
    """Get all available annotation tracks in the database."""

    result: list[str] = db.get_collection(ANNOTATIONS_COLLECTION).distinct(
        "source", {"genome_build": genome_build.value}
    )
    return result


def get_track(track_id: PydanticObjectId, db: Database[Any]) -> AnnotationTrackInDb:
    """Get annotation track from database."""
    result: dict[str, Any] = db.get_collection(ANNOTATIONS_COLLECTION).find_one({"_id": track_id})

    return AnnotationTrackInDb.model_validate(result)