import importlib
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable

import pytest

from gens.models.genomic import GenomeBuild
from tests.utils import my_mongomock


@pytest.fixture(autouse=True)
def reload_cli(monkeypatch: pytest.MonkeyPatch):
    """Reload ``gens.cli.load`` after ensuring ``flask.json`` exists."""
    # import json as _json

    # flask_mod = sys.modules.setdefault("flask", types.ModuleType("flask"))
    # flask_mod.json = _json
    # stub sample annotation models to avoid heavy pydantic dependencies
    sa_mod: Any = types.ModuleType("gens.models.sample_annotation")

    class SampleAnnotationTrack:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self):
            return dict(vars(self))

    class SampleAnnotationRecord(SampleAnnotationTrack):
        @classmethod
        def model_validate(cls, data):
            return cls(**data)

    sa_mod.SampleAnnotationTrack = SampleAnnotationTrack
    sa_mod.SampleAnnotationRecord = SampleAnnotationRecord
    sa_mod.SampleAnnotationTrackInDb = SampleAnnotationTrack
    monkeypatch.setitem(sys.modules, "gens.models.sample_annotation", sa_mod)

    # import gens.models.base as base_mod
    # monkeypatch.setattr(base_mod, "PydanticObjectId", str, raising=False)
    # if hasattr(base_mod.RWModel, "Config"):
    #     monkeypatch.setattr(base_mod.RWModel.Config, "arbitrary_types_allowed", True, raising=False)
    # if hasattr(base_mod.RWModel, "__config__"):
    #     base_mod.RWModel.__config__.arbitrary_types_allowed = True

    sys.modules.pop("gens.cli.load", None)
    yield importlib.import_module("gens.cli.load")


def test_load_sample_annotation_invokes_crud(reload_cli, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    load_mod = reload_cli
    load_sample_annotation_cmd = load_mod.sample_annotation

    client = my_mongomock.MongoClient()
    db = client.get_database("test")


    monkeypatch.setattr(load_mod, "get_db_connection", lambda conn, db_name: db)
    monkeypatch.setattr(load_mod, "get_indexes", lambda db, col: [])
    monkeypatch.setattr(load_mod, "create_index", lambda db, col: None)

    monkeypatch.setattr(load_mod, "get_sample_annotation_track", lambda **kwargs: None)

    created = {}

    def fake_create_track(track, db):
        created["track"] = track
        return "tid"

    monkeypatch.setattr(load_mod, "create_sample_annotation_track", fake_create_track)

    parsed = {}

    def fake_parse_bed(file: Path):
        parsed["file"] = str(file)
        return [{"name": "rec", "chrom": "1", "start": "1", "end": "2", "color": "c"}]

    monkeypatch.setattr(load_mod, "parse_bed_file", fake_parse_bed)
    monkeypatch.setattr(
        load_mod,
        "fmt_bed_to_annotation",
        lambda rec, tid, gb: load_mod.SampleAnnotationRecord.model_validate(
            {
                "track_id": tid,
                "name": rec["name"],
                "genome_build": gb,
                "chrom": "1",
                "start": 1,
                "end": 2,
                "color": "c",
                "sample_id": "sample1",
                "case_id": "caseA",
            }
        ),
    )

    created_annots = {}

    def fake_create_annots(records, db):
        created_annots["records"] = records
        return ["id1"]

    monkeypatch.setattr(load_mod, "create_sample_annotations_for_track", fake_create_annots)
    monkeypatch.setattr(load_mod, "delete_sample_annotations_for_track", lambda tid, db: None)

    bed_file = tmp_path / "track.bed"
    bed_file.write_text("dummy")

    assert load_sample_annotation_cmd.callback is not None

    load_sample_annotation_cmd.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=load_mod.GenomeBuild(38),
        file=bed_file,
        name="trackA",
    )

    assert parsed["file"] == str(bed_file)
    assert isinstance(created.get("track"), load_mod.SampleAnnotationTrack)
    assert created_annots["records"]


def test_load_sample_annotation_updates_existing(reload_cli, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, db: my_mongomock.Database, patch_cli: Callable):
    load_mod = reload_cli
    load_sample_annotation_cmd = load_mod.sample_annotation

    patch_cli(load_mod)

    monkeypatch.setattr(
        load_mod,
        "get_sample_annotation_track",
        lambda **kwargs: SimpleNamespace(track_id="tid1"),
    )

    del_called = {}

    def fake_delete(tid, db):
        del_called["track"] = tid
        return True

    monkeypatch.setattr(load_mod, "delete_sample_annotations_for_track", fake_delete)
    monkeypatch.setattr(load_mod, "create_sample_annotation_track", lambda track, db: "tid2")

    monkeypatch.setattr(load_mod, "parse_bed_file", lambda f: [{"name": "rec", "chrom": "1", "start": "1", "end": "2", "color": "c"}])
    monkeypatch.setattr(
        load_mod,
        "fmt_bed_to_annotation",
        lambda rec, tid, gb: load_mod.SampleAnnotationRecord.model_validate(
            {
                "track_id": tid,
                "name": rec["name"],
                "genome_build": gb,
                "chrom": "1",
                "start": 1,
                "end": 2,
                "color": "c",
                "sample_id": "sample1",
                "case_id": "caseA",
            }
        ),
    )

    monkeypatch.setattr(load_mod, "create_sample_annotations_for_track", lambda records, db: ["id1"])

    bed_file = tmp_path / "ann.bed"
    bed_file.write_text("dummy")

    assert load_sample_annotation_cmd.callback is not None

    load_sample_annotation_cmd.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=load_mod.GenomeBuild(38),
        file=bed_file,
        name="trackA",
    )

    assert del_called.get("track") == "tid1"


def _build_track(load_mod):
    return load_mod.SampleAnnotationTrack(
        sample_id="sample1",
        case_id="caseA",
        name="track1",
        description="",
        genome_build=load_mod.GenomeBuild(38),
    )

def test_update_sample_annotation_track_modifies_collection(db: my_mongomock.Database) -> None:
    import importlib
    load_mod = importlib.import_module("gens.crud.sample_annotations")

    track_obj = _build_track(load_mod)
    coll = db.get_collection(load_mod.SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    coll.insert_one({"_id": "tid", **track_obj.model_dump()})

    load_mod.update_sample_annotation_track("tid", db, description="new")

    doc = coll.find_one({"_id": "tid"})
    assert doc is not None
    assert doc["description"] == "new"

def test_delete_sample_annotation_track_removes_document(db: my_mongomock.Database) -> None:
    import importlib
    load_mod = importlib.import_module("gens.crud.sample_annotations")

    track_obj = _build_track(load_mod)
    coll = db.get_collection(load_mod.SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    coll.insert_one({"_id": "tid", **track_obj.model_dump()})

    load_mod.delete_sample_annotation_track("tid", db)
    assert coll.find_one({"_id": "tid"}) is None