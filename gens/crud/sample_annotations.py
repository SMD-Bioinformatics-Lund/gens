import logging
from typing import Any

from pymongo import DESCENDING
from pymongo.cursor import Cursor
from pymongo.database import Database

from gens.db.collections import (
    SAMPLE_ANNOTATION_TRACKS_COLLECTION,
    SAMPLE_ANNOTATIONS_COLLECTION,
    UPDATES_COLLECTION,
)
from gens.models.annotation import SimplifiedTrackInfo
from gens.models.base import PydanticObjectId
from gens.models.genomic import Chromosome, GenomeBuild
from gens.models.sample_annotation import (
    SampleAnnotationRecord,
    SampleAnnotationTrack,
    SampleAnnotationTrackInDb,
)
from gens.utils import get_timestamp

LOG = logging.getLogger(__name__)


def get_sample_annotation_track(
    genome_build: GenomeBuild,
    db: Database[Any],
    sample_id: str,
    case_id: str,
    name: str | None = None,
    id: PydanticObjectId | None = None,
) -> SampleAnnotationTrackInDb | None:
    """Find a sample annotation track by name or ID."""

    if name is None and id is None:
        raise ValueError("Either the ID or the name must be specified")

    query: dict[str, Any] = {
        "genome_build": genome_build,
        "sample_id": sample_id,
        "case_id": case_id,
    }
    if name is not None:
        query["name"] = name
    elif id is not None:
        query["_id"] = id
    record = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION).find_one(query)
    if record is not None:
        return SampleAnnotationTrackInDb.model_validate(record)
    return None


def create_sample_annotation_track(
    track: SampleAnnotationTrack, db: Database[Any]
) -> PydanticObjectId:
    resp = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION).insert_one(
        track.model_dump()
    )
    return PydanticObjectId(resp.inserted_id)


def update_sample_annotation_track(
    track_id: PydanticObjectId, db: Database[Any], **fields: Any
) -> bool:
    update = {"$set": {"modified_at": get_timestamp(), **fields}}
    resp = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION).update_one(
        {"_id": track_id}, update=update
    )
    return resp.matched_count == 1 and resp.modified_count == 1


def delete_sample_annotation_track(
    track_id: PydanticObjectId, db: Database[Any]
) -> bool:
    resp = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION).delete_one(
        {"_id": track_id}
    )
    return resp.deleted_count == 1


def get_sample_annotation_tracks(
    genome_build: GenomeBuild | None, db: Database[Any], sample_id: str, case_id: str
) -> list[SampleAnnotationTrackInDb]:
    query: dict[str, Any] = {"sample_id": sample_id, "case_id": case_id}
    if genome_build is not None:
        query["genome_build"] = genome_build

    cursor = (
        db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION)
        .find(query)
        .sort({"name": DESCENDING})
    )
    return [SampleAnnotationTrackInDb.model_validate(track) for track in cursor]


def get_sample_annotations_for_track(
    track_id: PydanticObjectId, chromosome: Chromosome, db: Database[Any]
) -> list[SimplifiedTrackInfo]:
    projection = {
        "name": True,
        "start": True,
        "end": True,
        "chrom": True,
        "color": True,
    }
    cursor: Cursor = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION).find(
        {"track_id": track_id, "chrom": chromosome}, projection
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


def get_sample_annotations(
    record_id: PydanticObjectId, db: Database[Any]
) -> SampleAnnotationRecord | None:
    """Get single sample annotation record by its ID."""
    record = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION).find_one(
        {"_id": record_id}
    )
    if record is not None:
        return SampleAnnotationRecord.model_validate(record)
    return None


def delete_sample_annotations_for_track(
    track_id: PydanticObjectId, db: Database[Any]
) -> bool:
    resp = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION).delete_many(
        {"track_id": track_id}
    )
    if resp.deleted_count > 0:
        db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION).update_one(
            {"_id": track_id}, {"$set": {"modified_at": get_timestamp()}}
        )
        return True
    return False


def create_sample_annotations_for_track(
    annotations: list[SampleAnnotationRecord], db: Database[Any]
) -> list[PydanticObjectId]:
    data = [annot.model_dump() for annot in annotations]
    resp = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION).insert_many(data)
    if len(resp.inserted_ids) > 0:
        for track_id in {annot.track_id for annot in annotations}:
            db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION).update_one(
                {"_id": track_id}, {"$set": {"modified_at": get_timestamp()}}
            )
    return [PydanticObjectId(id) for id in resp.inserted_ids]


def register_data_update(
    db: Database[Any], track_type: str, name: str | None = None
) -> None:
    LOG.debug("Creating timestamp for %s", track_type)
    track = {"track": track_type, "name": name}
    collection = db.get_collection(UPDATES_COLLECTION)
    collection.delete_many(track)
    collection.insert_one({**track, "timestamp": get_timestamp()})
