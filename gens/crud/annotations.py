"""Related to manual annotation info."""

from collections import defaultdict
from itertools import groupby
from typing import Any
from pymongo.database import Database
import logging

from gens.models.annotation import AnnotationTrackInDb
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild, VariantCategory
from gens.db.collections import ANNOTATIONS_COLLECTION, UPDATES_COLLECTION
from gens.utils import get_timestamp
from .utils import query_genomic_region


LOG = logging.getLogger(__name__)


def get_annotation_tracks(genome_build: GenomeBuild, db: Database[Any]) -> list[str]:
    """Get all available annotation tracks in the database."""

    result: list[str] = db.get_collection(ANNOTATIONS_COLLECTION).distinct(
        "source", {"genome_build": genome_build.value}
    )
    return result


def get_track(
        track_id: PydanticObjectId, 
        db: Database[Any]) -> AnnotationTrackInDb:
    """Get annotation track from database."""
    result: dict[str, Any] = db.get_collection(ANNOTATIONS_COLLECTION).find_one({"_id": track_id})

    return AnnotationTrackInDb.model_validate(result)


def register_data_update(db: Database[Any], track_type: str, name: str | None = None) -> None:
    """Register that a track was updated."""
    LOG.debug("Creating timestamp for %s", track_type)
    track: dict[str, str | None] = {"track": track_type, "name": name}
    collection = db.get_collection(UPDATES_COLLECTION)
    collection.delete_many(track)  # remove old track
    collection.insert_one({**track, "timestamp": get_timestamp()})


def get_data_update_timestamp(gens_db: Database[Any], track_type: str = "all") -> dict[str, list[dict[str, Any]]]:
    """Get when a annotation track was last updated."""
    LOG.debug("Reading timestamp for %s", track_type)
    updates_coll = gens_db.get_collection(UPDATES_COLLECTION)
    if track_type == "all":
        query = updates_coll.find()
    else:
        query = updates_coll.find({"track": track_type})

    # build results from query
    results: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for key, entries in groupby(query, key=lambda x: x["track"]):
        for entry in entries:
            results[key].append(
                {
                    "tack": entry["track"],
                    "name": entry["name"],
                    "timestamp": entry["timestamp"].strftime("%Y-%m-%d"),
                }
            )
    return results