import importlib
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any, Callable

import mongomock
import pytest

from gens.db.collections import SAMPLE_ANNOTATION_TRACKS_COLLECTION, SAMPLE_ANNOTATIONS_COLLECTION
from gens.models.genomic import GenomeBuild
from gens.models.sample_annotation import SampleAnnotationTrack

@pytest.fixture
def load_sample_annotation_cmd() -> ModuleType:
    module = importlib.import_module("gens.cli.load")
    return module

def _write_bed(path: Path, start: int, end: int) -> None:
    bed_line = "\t".join([
        "1",
        str(start),
        str(end),
        "rec",
        "0",
        "+",
        ".",
        ".",
        "rgb(0,0,255)"
    ])
    path.write_text(bed_line)


def test_load_sample_annotation_creates_documents(
    load_sample_annotation_cmd: ModuleType,
    patch_cli: Callable,
    tmp_path: Path,
    db: mongomock.Database
) -> None:
    patch_cli(load_sample_annotation_cmd)

    bed_file = tmp_path / "track.bed"
    _write_bed(bed_file, 0, 10)

    load_sample_annotation_cmd.sample_annotation.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(38),
        file=bed_file,
        name="trackA"
    )

    track_coll = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    annot_coll = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION)

    assert track_coll.count_documents({}) == 1
    assert annot_coll.count_documents({}) == 1

    rec = annot_coll.find_one({})
    assert rec is not None
    assert rec["sample_id"] == "sample1"
    assert rec["case_id"] == "caseA"
    assert rec["chrom"] == "1"
    assert rec["start"] == 1
    assert rec["end"] == 10


def test_load_sample_annotation_updates_existing(
    load_sample_annotation_cmd: ModuleType,
    patch_cli: Callable,
    tmp_path: Path,
    db: mongomock.Database
) -> None:
    patch_cli(load_sample_annotation_cmd)

    bed1 = tmp_path / "t1.bed"
    _write_bed(bed1, 0, 10)
    load_sample_annotation_cmd.sample_annotation.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(38),
        file=bed1,
        name="trackA",
    )

    track_coll = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    annot_coll = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION)
    first_track = track_coll.find_one({})

    assert first_track is not None

    bed2 = tmp_path / "t2.bed"
    _write_bed(bed2, 100, 200)
    load_sample_annotation_cmd.sample_annotation.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(38),
        file=bed2,
        name="trackA",
    )

    assert track_coll.count_documents({}) == 1
    updated_track = track_coll.find_one({})
    assert updated_track is not None
    assert updated_track["_id"] == first_track["_id"]

    assert annot_coll.count_documents({}) == 1
    updated_annot = annot_coll.find_one({})
    assert updated_annot is not None
    assert updated_annot["start"] == 101
    assert updated_annot["end"] == 200
    assert updated_annot["track_id"] == first_track["_id"]


def test_update_sample_annotation_track_modifies_collection(db: mongomock.Database) -> None:
    import importlib

    load_mod = importlib.import_module("gens.crud.sample_annotations")

    track_obj = _build_track()
    coll = db.get_collection(load_mod.SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    coll.insert_one({"_id": "tid", **track_obj.model_dump()})

    load_mod.update_sample_annotation_track("tid", db, description="new")

    doc = coll.find_one({"_id": "tid"})
    assert doc is not None
    assert doc["description"] == "new"


def test_delete_sample_annotation_track_removes_document(db: mongomock.Database) -> None:
    import importlib

    load_mod = importlib.import_module("gens.crud.sample_annotations")

    track_obj = _build_track()
    coll = db.get_collection(load_mod.SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    coll.insert_one({"_id": "tid", **track_obj.model_dump()})

    load_mod.delete_sample_annotation_track("tid", db)
    assert coll.find_one({"_id": "tid"}) is None
    assert coll.find_one({"_id": "tid"}) is None


def _build_track() -> SampleAnnotationTrack:
    from gens.models.sample_annotation import SampleAnnotationTrack

    return SampleAnnotationTrack(
        sample_id="sample1",
        case_id="caseA",
        name="track1",
        description="",
        genome_build=GenomeBuild(38),
    )
