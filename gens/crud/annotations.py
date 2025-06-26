"""Related to manual annotation info."""

import logging
from collections import defaultdict
from itertools import groupby
from typing import Any

from pymongo.cursor import Cursor
from pymongo import DESCENDING
from pymongo.database import Database

from gens.db.collections import (
    ANNOTATION_TRACKS_COLLECTION,
    ANNOTATIONS_COLLECTION,
    UPDATES_COLLECTION,
)
from gens.models.annotation import (
    AnnotationRecord,
    AnnotationTrack,
    AnnotationTrackInDb,
    SimplifiedTrackInfo,
)
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild
from gens.utils import get_timestamp

LOG = logging.getLogger(__name__)


def get_annotation_track(
    genome_build: GenomeBuild,
    db: Database[Any],
    name: str | None = None,
    id: PydanticObjectId | None = None,
) -> AnnotationTrackInDb | None:
    """Search the database for a annotation track with either NAME or ID and genome_build.

    Return None if no track was found.
    """
    if name is None and id is None:
        raise ValueError("Either the id or name must be specified!")

    query: dict[str, str | PydanticObjectId | GenomeBuild] = {
        "genome_build": genome_build
    }
    if name is not None:
        query["name"] = name
    elif id is not None:
        query["_id"] = id
    record = db.get_collection(ANNOTATION_TRACKS_COLLECTION).find_one(query)
    if record is not None:
        return AnnotationTrackInDb.model_validate(record)
    return None


def create_annotation_track(
    track: AnnotationTrack, db: Database[Any]
) -> PydanticObjectId:
    """Create a new annotation track and return the track id."""
    resp = db.get_collection(ANNOTATION_TRACKS_COLLECTION).insert_one(
        track.model_dump()
    )
    return PydanticObjectId(resp.inserted_id)


def update_annotation_track(
    track_id: PydanticObjectId, db: Database[Any], **fields: Any
) -> bool:
    """Update fields in existing track with ID and return true if update was successfull."""
    # build update command
    update: dict[str, Any] = {"$set": {"modified_at": get_timestamp(), **fields}}
    resp = db.get_collection(ANNOTATION_TRACKS_COLLECTION).update_one(
        {"_id": track_id}, update=update
    )
    return resp.matched_count == 1 and resp.modified_count == 1


def delete_annotation_track(track_id: PydanticObjectId, db: Database[Any]) -> bool:
    """Delete annotation track with track id.

    Return true if recrod was removed."""
    resp = db.get_collection(ANNOTATION_TRACKS_COLLECTION).delete_one({"_id": track_id})
    return resp.deleted_count == 1


def get_annotation_tracks(
    genome_build: GenomeBuild | None, db: Database[Any]
) -> list[AnnotationTrackInDb]:
    """Get all available annotation tracks in the database."""

    # build query
    query: dict[str, GenomeBuild] = {}
    if genome_build is not None:
        query["genome_build"] = genome_build

    cursor = (
        db.get_collection(ANNOTATION_TRACKS_COLLECTION)
        .find(query)
        .sort({"name": DESCENDING})
    )
    return [AnnotationTrackInDb.model_validate(track) for track in cursor]


def get_annotations_for_track(
    track_id: PydanticObjectId, db: Database[Any]
) -> list[SimplifiedTrackInfo]:
    """Get annotation track from database."""
    projection: dict[str, bool] = {"name": True, "start": True, "end": True, "chrom": True, "color": True}
    cursor: Cursor = db.get_collection(ANNOTATIONS_COLLECTION).find(
        {"track_id": track_id}, projection
    )
    return [
        SimplifiedTrackInfo.model_validate(
            {
                "record_id": doc["_id"],
                "name": doc["name"],
                "chrom": doc["chrom"],
                "start": doc["start"],
                "end": doc["end"],
                "color": doc["color"],
                "type": "annotation",
            }
        )
        for doc in cursor
    ]


def delete_annotations_for_track(track_id: PydanticObjectId, db: Database[Any]) -> bool:
    """Remove annotation records that belong to a track from the database."""
    resp = db.get_collection(ANNOTATIONS_COLLECTION).delete_many({"track_id": track_id})
    if resp.deleted_count > 0:
        # update modified timestamp for annotation track
        db.get_collection(ANNOTATION_TRACKS_COLLECTION).update_one(
            {"track_id": track_id}, {"$set": {"modified_at": get_timestamp()}}
        )
        return True
    else:
        return False


def create_annotations_for_track(
    annotations: list[AnnotationRecord], db: Database[Any]
) -> list[PydanticObjectId]:
    """Insert annotations records in the database and return their object ids."""
    data: list[dict[str, Any]] = [annot.model_dump() for annot in annotations]
    LOG.info("inserting %d annotations", len(data))
    resp = db.get_collection(ANNOTATIONS_COLLECTION).insert_many(data)
    if len(resp.inserted_ids) > 0:
        # get track ids from annotations and update modified timestamp for related track
        for track_id in {annot.track_id for annot in annotations}:
            db.get_collection(ANNOTATION_TRACKS_COLLECTION).update_one(
                {"track_id": track_id}, {"$set": {"modified_at": get_timestamp()}}
            )
    return [PydanticObjectId(id) for id in resp.inserted_ids]


def get_annotation(
    record_id: PydanticObjectId, db: Database[Any]
) -> AnnotationRecord | None:
    """Get annotation from the database with ID.

    Return None if there is no annotation with given id.
    """
    resp = db.get_collection(ANNOTATIONS_COLLECTION).find_one({"_id": record_id})
    if resp is not None:
        return AnnotationRecord.model_validate(resp)
    return None


def register_data_update(
    db: Database[Any], track_type: str, name: str | None = None
) -> None:
    """Register that a track was updated."""
    LOG.debug("Creating timestamp for %s", track_type)
    track: dict[str, str | None] = {"track": track_type, "name": name}
    collection = db.get_collection(UPDATES_COLLECTION)
    collection.delete_many(track)  # remove old track
    collection.insert_one({**track, "timestamp": get_timestamp()})


def get_data_update_timestamp(
    gens_db: Database[Any], track_type: str = "all"
) -> dict[str, list[dict[str, Any]]]:
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
