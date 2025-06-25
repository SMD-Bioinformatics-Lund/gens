from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path
from typing import Any

import pytest
from click.testing import CliRunner
import logging

from tests.utils import my_mongomock

LOG = logging.getLogger()


# class DummyDB(dict):
#     def __getitem__(self, key):  # pragma: no cover
#         return self


@pytest.fixture()
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture(autouse=True)
def reload_cli(monkeypatch: pytest.MonkeyPatch):
    """Reload gens.cli.load after stubbing models."""
    # stub annotation models to avoid heavy dependencies
    annot_mod: Any = types.ModuleType("gens.models.annotation")

    class AnnotationTrack:
        def __init__(self, name: str, description: str, genome_build):
            self.name = name
            self.description = description
            self.genome_build = genome_build

    class AnnotationRecord:
        def __init__(self, **kwargs):
            for key, val in kwargs.items():
                setattr(self, key, val)

        @classmethod
        def model_validate(cls, data):
            return cls(**data)

    annot_mod.AnnotationTrack = AnnotationTrack
    annot_mod.AnnotationRecord = AnnotationRecord
    annot_mod.AnnotationTrackInDb = AnnotationTrack
    annot_mod.SimplifiedTrackInfo = AnnotationRecord
    annot_mod.TranscriptRecord = AnnotationRecord
    annot_mod.ExonFeature = AnnotationRecord
    annot_mod.UtrFeature = AnnotationRecord
    annot_mod.SimplifiedTranscriptInfo = AnnotationRecord
    annot_mod.Comment = object
    annot_mod.DatetimeMetadata = object
    annot_mod.DnaStrandMetadata = object
    annot_mod.GenericMetadata = object
    annot_mod.ReferenceUrl = object
    annot_mod.ScientificArticle = object
    annot_mod.UrlMetadata = object
    monkeypatch.setitem(sys.modules, "gens.models.annotation", annot_mod)

    import gens.models.base as base_mod

    # monkeypatch.setattr(base_mod, "PydanticObjectId", str, raising=False)
    # if hasattr(base_mod.RWModel, "Config"):
    #     monkeypatch.setattr(base_mod.RWModel.Config, "arbitrary_types_allowed", True, raising=False)
    # if hasattr(base_mod.RWModel, "__config__"):
    #     base_mod.RWModel.__config__.arbitrary_types_allowed = True

    yield importlib.reload(importlib.import_module("gens.cli.load"))


def test_load_annotations_invokes_crud(
    reload_cli, monkeypatch: pytest.MonkeyPatch, runner: CliRunner, tmp_path: Path, capsys
):
    load = reload_cli
    client = my_mongomock.MongoClient()
    db = client.get_database("test")

    LOG.debug(">>> 1")

    monkeypatch.setattr(load, "get_db_connection", lambda conn, db_name: db)
    monkeypatch.setattr(load, "get_indexes", lambda db, col: [])
    monkeypatch.setattr(load, "create_index", lambda db, col: None)

    LOG.debug(">>> 2")

    parse_called = {}
    records = [{"name": "rec1", "chrom": "1", "start": 1, "end": 2, "color": "c"}]

    LOG.debug(">>> 3")

    def fake_parse(file: Path):
        parse_called["path"] = str(file)
        return records

    monkeypatch.setattr(load, "parse_bed_file", fake_parse)
    monkeypatch.setattr(
        load,
        "fmt_bed_to_annotation",
        lambda rec, tid, gb: load.AnnotationRecord(track_id=tid, genome_build=gb, **rec),
    )
    monkeypatch.setattr(load, "parse_tsv_file", lambda f: records)
    monkeypatch.setattr(load, "parse_aed_file", lambda f, cont: ([], []))

    LOG.debug(">>> 4")

    created = {}

    def fake_create_track(track, db):
        created["track"] = track
        return "tid"

    monkeypatch.setattr(load, "create_annotation_track", fake_create_track)
    monkeypatch.setattr(load, "get_annotation_track", lambda name, genome_build, db: None)
    monkeypatch.setattr(load, "update_annotation_track", lambda track_id, metadata, db: None)
    monkeypatch.setattr(load, "delete_annotation_track", lambda track_id, db: None)
    monkeypatch.setattr(load, "delete_annotations_for_track", lambda tid, db: True)

    annots = {}

    def fake_create_annotations(recs, db):
        annots["records"] = recs
        return ["id1"]

    monkeypatch.setattr(load, "create_annotations_for_track", fake_create_annotations)

    bed_file = tmp_path / "my.bed"
    bed_file.write_text("dummy")

    load.annotations.callback(
        file=bed_file,
        genome_build=load.GenomeBuild(38),
        is_tsv=False,
        ignore_errors=False,
    )

    assert parse_called["path"] == str(bed_file)
    assert isinstance(created.get("track"), load.AnnotationTrack)
    assert annots["records"]
