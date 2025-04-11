"""Related to manual annotation info."""

from collections import defaultdict
from itertools import groupby
from typing import Any
from pymongo.database import Database
from pymongo import DESCENDING
import logging

from gens.models.annotation import AnnotationRecord, AnnotationTrackInDb, ReducedTrackInfo
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild
from gens.db.collections import ANNOTATIONS_COLLECTION, ANNOTATION_TRACKS_COLLECTION, UPDATES_COLLECTION
from gens.utils import get_timestamp


LOG = logging.getLogger(__name__)


def get_annotation_tracks(genome_build: GenomeBuild | None, db: Database[Any]) -> list[AnnotationTrackInDb]:
    """Get all available annotation tracks in the database."""

    # build query
    query: dict[str, GenomeBuild] = {}
    if genome_build is not None:
        query["genome_build"] = genome_build

    cursor = db.get_collection(ANNOTATION_TRACKS_COLLECTION).find(query).sort({"name": DESCENDING})
    return [AnnotationTrackInDb.model_validate(track) for track in cursor]


def get_annotations_for_track(track_id: PydanticObjectId, db: Database[Any]) -> list[ReducedTrackInfo]:
    """Get annotation track from database."""
    projection: dict[str, bool] = {"name": True, "start": True, "end": True}
    cursor: list[dict[str, Any]] = db.get_collection(ANNOTATIONS_COLLECTION).find({"track_id": track_id}, projection)
    return [
        ReducedTrackInfo.model_validate({
            "record_id": doc["_id"],
            "name": doc["name"],
            "start": doc["start"],
            "end": doc["end"],
            "type": "annotation",
        }) for doc in cursor]


def get_annotation(record_id: PydanticObjectId, db: Database[Any]) -> AnnotationRecord | None:
    """Get annotation from the database with ID.
    
    Return None if there is no annotation with given id.
    """
    resp = db.get_collection(ANNOTATIONS_COLLECTION).find_one({"_id": record_id})
    if resp is not None:
        return AnnotationRecord.model_validate(resp)


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