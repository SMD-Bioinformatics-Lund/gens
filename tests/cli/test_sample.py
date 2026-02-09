import gzip
import logging
from pathlib import Path
from types import ModuleType
from typing import Any

import click
import mongomock
import pytest

from gens.crud.samples import update_sample
from gens.db.collections import (
    SAMPLE_ANNOTATIONS_COLLECTION,
    SAMPLE_ANNOTATION_TRACKS_COLLECTION,
    SAMPLES_COLLECTION,
)
from gens.models.genomic import GenomeBuild
from gens.models.sample import MetaEntry, MetaValue, SampleInfo, SampleSex
from gens.models.sample_annotation import SampleAnnotationTrack

LOG = logging.getLogger(__name__)


def write_sample_track(file_path: Path) -> Path:
    with gzip.open(file_path, "wt", encoding="utf-8") as fh:
        fh.write("0_1\t0\t1\t0.1\n")
    return file_path


@pytest.fixture(autouse=True)
def ensure_indexes(db: mongomock.Database):
    coll = db.get_collection(SAMPLES_COLLECTION)
    coll.create_index(
        [("sample_id", 1), ("case_id", 1), ("genome_build", 1)], unique=True
    )


def test_load_sample_cli(
    cli_load: ModuleType,
    db: mongomock.Database,
    tmp_path: Path,
):
    baf_file = write_sample_track(tmp_path / "baf.gz")
    cov_file = write_sample_track(tmp_path / "cov.gz")
    meta_file_simple = tmp_path / "meta_simple.tsv"
    meta_file_simple.write_text("type\tvalue\nA\t1\n")
    meta_file_complex = tmp_path / "meta_complex.tsv"
    meta_file_complex.write_text(
        "chrom\ttype\tvalue\n"
        "chr1\tavg_cov\t23.4\n"
        "chr1\tavg_roh\t0.2\n"
        "chr2\tavg_cov\t22.1\n"
        "chr2\tavg_roh\t0.12\n"
    )

    cli_load.sample.callback(
        sample_id="sample1",
        genome_build=38,
        baf=baf_file,
        coverage=cov_file,
        case_id="case1",
        meta_files=[meta_file_simple, meta_file_complex],
        sample_type="proband",
        sex="M",
    )

    coll = db.get_collection(SAMPLES_COLLECTION)
    assert coll.count_documents({}) == 1
    doc = coll.find_one({})
    assert doc is not None
    assert doc["sample_id"] == "sample1"
    assert doc["case_id"] == "case1"
    assert doc["genome_build"] == 38
    assert Path(doc["baf_file"]) == baf_file
    assert Path(doc["coverage_file"]) == cov_file
    assert doc["sample_type"] == "proband"
    assert len(doc["meta"]) == 2

    assert doc["meta"][0]["file_name"] == "meta_simple.tsv"
    assert doc["meta"][0]["row_name_header"] is None
    assert len(doc["meta"][0]["data"]) == 1
    assert doc["meta"][0]["data"][0] == {
        "type": "A",
        "value": "1",
        "row_name": None,
        "color": "rgb(0,0,0)",
    }

    assert doc["meta"][1]["file_name"] == "meta_complex.tsv"
    assert doc["meta"][1]["row_name_header"] == "chrom"
    assert len(doc["meta"][1]["data"]) == 4
    assert doc["meta"][1]["data"][0] == {
        "type": "avg_cov",
        "value": "23.4",
        "row_name": "chr1",
        "color": "rgb(0,0,0)",
    }


def test_delete_sample_metadata_cli_removes_all_entries(
    cli_delete: ModuleType,
    db: mongomock.Database,
    tmp_path: Path,
) -> None:
    sample_file = write_sample_track(tmp_path / "sample.gz")
    sample_obj = SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(37),
        baf_file=sample_file,
        coverage_file=sample_file,
        sample_type=None,
        sex=None,
        meta=[
            MetaEntry(
                id="meta1", file_name="meta.tsv", data=[MetaValue(type="a", value="1")]
            ),
            MetaEntry(
                id="meta2", file_name="other.tsv", data=[MetaValue(type="b", value="2")]
            ),
        ],
    )
    update_sample(db, sample_obj)

    cli_delete.sample_meta.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(37),
        meta_id=None,
        file_name=None,
        force=True,
    )

    doc = db.get_collection(SAMPLES_COLLECTION).find_one({"sample_id": "sample1"})
    assert doc is not None
    assert doc["meta"] == []


def test_delete_sample_metadata_cli_filters_by_id(
    cli_delete: ModuleType,
    db: mongomock.Database,
    tmp_path: Path,
) -> None:
    sample_file = write_sample_track(tmp_path / "sample.gz")
    sample_obj = SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(37),
        baf_file=sample_file,
        coverage_file=sample_file,
        sample_type=None,
        sex=None,
        meta=[
            MetaEntry(
                id="meta1", file_name="meta.tsv", data=[MetaValue(type="a", value="1")]
            ),
            MetaEntry(
                id="meta2", file_name="other.tsv", data=[MetaValue(type="b", value="2")]
            ),
        ],
    )
    update_sample(db, sample_obj)

    cli_delete.sample_meta.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(37),
        meta_id="meta1",
        file_name=None,
        force=True,
    )

    doc = db.get_collection(SAMPLES_COLLECTION).find_one({"sample_id": "sample1"})
    assert doc is not None
    assert len(doc["meta"]) == 1
    assert doc["meta"][0]["id"] == "meta2"


def test_load_sample_cli_with_string_genome_build_fails(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
):
    baf_file = write_sample_track(tmp_path / "baf.gz")
    cov_file = write_sample_track(tmp_path / "cov.gz")
    meta_file = tmp_path / "meta.tsv"
    meta_file.write_text("type\tvalue\nA\t1\n")

    sample_coll = db.get_collection(SAMPLES_COLLECTION)

    cli_load.sample.callback(
        sample_id="sample1",
        genome_build="38",
        baf=baf_file,
        coverage=cov_file,
        case_id="case1",
        meta_files=[meta_file],
        sample_type="proband",
        sex="M",
    )

    assert sample_coll.count_documents({}) == 1
    rec = sample_coll.find_one()

    assert rec is not None
    assert rec["genome_build"] == 38

    cli_load.sample.callback(
        sample_id="sample1",
        genome_build=38,
        baf=baf_file,
        coverage=cov_file,
        case_id="case1",
        meta_files=[meta_file],
        sample_type="proband",
        sex="M",
    )

    assert sample_coll.count_documents({}) == 1


@pytest.mark.parametrize("alias,expected", [("T", "tumor"), ("N", "normal")])
def test_load_sample_cli_accepts_aliases(
    cli_load: ModuleType,
    db: mongomock.Database,
    tmp_path: Path,
    alias: str,
    expected: str,
) -> None:
    baf_file = write_sample_track(tmp_path / "baf.gz")
    cov_file = write_sample_track(tmp_path / "cov.gz")

    cli_load.sample.callback(
        sample_id=f"sample-{alias}",
        genome_build=38,
        baf=baf_file,
        coverage=cov_file,
        case_id=f"case-{alias}",
        meta_files=[],
        sample_type=alias,
        sex=None,
    )

    doc = db.get_collection(SAMPLES_COLLECTION).find_one(
        {"sample_id": f"sample-{alias}"}
    )
    assert doc is not None
    assert doc["sample_type"] == expected


def test_delete_sample_cli_removes_document(
    cli_delete: ModuleType,
    db: mongomock.Database,
) -> None:
    coll = db.get_collection(SAMPLES_COLLECTION)
    coll.insert_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(37)}
    )

    cli_delete.sample.callback(sample_id="sample1", genome_build=37, case_id="caseA")

    assert coll.find_one({"sample_id": "sample1"}) is None


def test_delete_case_cli_removes_case_samples_and_sample_annotations(
    cli_delete: ModuleType,
    db: mongomock.Database,
) -> None:
    samples = db.get_collection(SAMPLES_COLLECTION)
    samples.insert_many(
        [
            {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(38)},
            {"sample_id": "sample2", "case_id": "caseA", "genome_build": GenomeBuild(38)},
            {"sample_id": "sample3", "case_id": "caseA", "genome_build": GenomeBuild(37)},
            {"sample_id": "sample4", "case_id": "caseB", "genome_build": GenomeBuild(38)},
        ]
    )

    sample_tracks = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    sample_annots = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION)

    deleted_track = SampleAnnotationTrack(
        sample_id="sample1",
        case_id="caseA",
        name="track-del",
        description="",
        genome_build=GenomeBuild(38),
    )
    kept_track = SampleAnnotationTrack(
        sample_id="sample4",
        case_id="caseB",
        name="track-keep",
        description="",
        genome_build=GenomeBuild(38),
    )

    deleted_track_id = sample_tracks.insert_one(deleted_track.model_dump()).inserted_id
    kept_track_id = sample_tracks.insert_one(kept_track.model_dump()).inserted_id
    sample_annots.insert_many(
        [
            {
                "track_id": deleted_track_id,
                "sample_id": "sample1",
                "case_id": "caseA",
                "chrom": "1",
                "start": 1,
                "end": 10,
                "name": "rec",
                "color": [0, 0, 0],
            },
            {
                "track_id": kept_track_id,
                "sample_id": "sample4",
                "case_id": "caseB",
                "chrom": "1",
                "start": 1,
                "end": 10,
                "name": "rec",
                "color": [0, 0, 0],
            },
        ]
    )

    cli_delete.case.callback(case_id="caseA", genome_build=GenomeBuild(38), force=True)

    assert samples.count_documents({"case_id": "caseA", "genome_build": GenomeBuild(38)}) == 0
    assert samples.count_documents({"case_id": "caseA", "genome_build": GenomeBuild(37)}) == 1
    assert samples.count_documents({"case_id": "caseB", "genome_build": GenomeBuild(38)}) == 1

    assert sample_tracks.count_documents({"case_id": "caseA", "genome_build": GenomeBuild(38)}) == 0
    assert sample_tracks.count_documents({"case_id": "caseB", "genome_build": GenomeBuild(38)}) == 1
    assert sample_annots.count_documents({"track_id": deleted_track_id}) == 0
    assert sample_annots.count_documents({"track_id": kept_track_id}) == 1


def test_delete_case_cli_raises_on_missing_case(
    cli_delete: ModuleType,
    db: mongomock.Database,
) -> None:
    db.get_collection(SAMPLES_COLLECTION).insert_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(38)}
    )

    with pytest.raises(
        click.ClickException,
        match="No samples found for case_id 'missing' and genome build '38'",
    ):
        cli_delete.case.callback(
            case_id="missing",
            genome_build=GenomeBuild(38),
            force=True,
        )


def test_load_case_cli_from_yaml(
    cli_load: ModuleType,
    db: mongomock.Database,
    tmp_path: Path,
) -> None:
    tracks_dir = tmp_path / "tracks"
    tracks_dir.mkdir()
    meta_dir = tmp_path / "meta"
    meta_dir.mkdir()
    annots_dir = tmp_path / "annotations"
    annots_dir.mkdir()

    child_baf = write_sample_track(tracks_dir / "child.baf.gz")
    child_cov = write_sample_track(tracks_dir / "child.cov.gz")
    write_sample_track(tracks_dir / "mother.baf.gz")
    write_sample_track(tracks_dir / "mother.cov.gz")
    write_sample_track(tracks_dir / "father.baf.gz")
    write_sample_track(tracks_dir / "father.cov.gz")

    shared_meta = meta_dir / "shared.tsv"
    shared_meta.write_text("type\tvalue\ncohort\ttrio\n")
    child_meta = meta_dir / "child.tsv"
    child_meta.write_text("type\tvalue\nrole\tproband\n")

    (annots_dir / "child_events.bed").write_text(
        "1\t10\t20\tchild event\t0\t+\t.\t.\trgb(0,0,255)\n"
    )

    config_path = tmp_path / "case.yml"
    config_path.write_text(
        (
            "case_id: case_trio\n"
            "genome_build: 38\n"
            "samples:\n"
            "  - sample_id: child\n"
            "    baf: tracks/child.baf.gz\n"
            "    coverage: tracks/child.cov.gz\n"
            "    sample_type: proband\n"
            "    sex: M\n"
            "    meta_files:\n"
            "      - meta/shared.tsv\n"
            "      - meta/child.tsv\n"
            "    sample_annotations:\n"
            "      - file: annotations/child_events.bed\n"
            "        name: child-events\n"
            "  - sample_id: mother\n"
            "    baf: tracks/mother.baf.gz\n"
            "    coverage: tracks/mother.cov.gz\n"
            "    sample_type: mother\n"
            "    sex: F\n"
            "    meta_files:\n"
            "      - meta/shared.tsv\n"
            "  - sample_id: father\n"
            "    baf: tracks/father.baf.gz\n"
            "    coverage: tracks/father.cov.gz\n"
            "    sample_type: father\n"
            "    sex: M\n"
            "    meta_files:\n"
            "      - meta/shared.tsv\n"
        )
    )

    cli_load.case.callback(config_file=config_path)

    coll = db.get_collection(SAMPLES_COLLECTION)
    assert coll.count_documents({"case_id": "case_trio"}) == 3

    child_doc = coll.find_one({"sample_id": "child", "case_id": "case_trio"})
    assert child_doc is not None
    assert child_doc["sex"] == "M"
    assert child_doc["sample_type"] == "proband"
    assert Path(child_doc["baf_file"]) == child_baf
    assert Path(child_doc["coverage_file"]) == child_cov
    assert {meta["file_name"] for meta in child_doc["meta"]} == {
        shared_meta.name,
        child_meta.name,
    }

    mother_doc = coll.find_one({"sample_id": "mother", "case_id": "case_trio"})
    assert mother_doc is not None
    assert mother_doc["sex"] == "F"
    assert mother_doc["sample_type"] == "mother"
    assert len(mother_doc["meta"]) == 1
    assert mother_doc["meta"][0]["file_name"] == shared_meta.name

    father_doc = coll.find_one({"sample_id": "father", "case_id": "case_trio"})
    assert father_doc is not None
    assert father_doc["sex"] == "M"
    assert father_doc["sample_type"] == "father"
    assert len(father_doc["meta"]) == 1
    assert father_doc["meta"][0]["file_name"] == shared_meta.name

    sample_tracks = db.get_collection(SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    sample_annots = db.get_collection(SAMPLE_ANNOTATIONS_COLLECTION)
    assert sample_tracks.count_documents({}) == 1
    assert sample_annots.count_documents({}) == 1

    sample_track_doc = sample_tracks.find_one({})
    assert sample_track_doc is not None
    assert sample_track_doc["sample_id"] == "child"
    assert sample_track_doc["case_id"] == "case_trio"
    assert sample_track_doc["name"] == "child-events"


def test_load_case_cli_rejects_top_level_meta_files(
    cli_load: ModuleType,
    tmp_path: Path,
) -> None:
    tracks_dir = tmp_path / "tracks"
    tracks_dir.mkdir()
    meta_dir = tmp_path / "meta"
    meta_dir.mkdir()
    write_sample_track(tracks_dir / "child.baf.gz")
    write_sample_track(tracks_dir / "child.cov.gz")
    (meta_dir / "shared.tsv").write_text("type\tvalue\ncohort\ttrio\n")

    config_path = tmp_path / "case.yml"
    config_path.write_text(
        (
            "case_id: case_trio\n"
            "genome_build: 38\n"
            "meta_files:\n"
            "  - meta/shared.tsv\n"
            "samples:\n"
            "  - sample_id: child\n"
            "    baf: tracks/child.baf.gz\n"
            "    coverage: tracks/child.cov.gz\n"
        )
    )

    with pytest.raises(click.UsageError, match="meta_files"):
        cli_load.case.callback(config_file=config_path)


def test_load_case_cli_rejects_top_level_annotations(
    cli_load: ModuleType,
    tmp_path: Path,
) -> None:
    tracks_dir = tmp_path / "tracks"
    tracks_dir.mkdir()
    annots_dir = tmp_path / "annotations"
    annots_dir.mkdir()
    write_sample_track(tracks_dir / "child.baf.gz")
    write_sample_track(tracks_dir / "child.cov.gz")
    (annots_dir / "cnv.bed").write_text("1\t0\t10\tgain\t0\t+\t.\t.\trgb(255,0,0)\n")

    config_path = tmp_path / "case.yml"
    config_path.write_text(
        (
            "case_id: case_trio\n"
            "genome_build: 38\n"
            "samples:\n"
            "  - sample_id: child\n"
            "    baf: tracks/child.baf.gz\n"
            "    coverage: tracks/child.cov.gz\n"
            "annotations:\n"
            "  - file: annotations/cnv.bed\n"
        )
    )

    with pytest.raises(click.UsageError, match="annotations"):
        cli_load.case.callback(config_file=config_path)


def test_update_sample_updates_document(
    cli_update: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    db: mongomock.Database,
) -> None:
    existing_sample_file = write_sample_track(tmp_path / "existing_sample")
    existing_meta = MetaEntry(
        id="existing-id",
        file_name="meta.tsv",
        row_name_header=None,
        data=[MetaValue(type="old", value="x")],
    )
    other_meta = MetaEntry(
        id="other-id",
        file_name="other.tsv",
        row_name_header=None,
        data=[MetaValue(type="B", value="2")],
    )
    sample_obj = SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(37),
        baf_file=existing_sample_file,
        coverage_file=existing_sample_file,
        sample_type=None,
        sex=None,
        meta=[existing_meta, other_meta],
    )

    monkeypatch.setattr(
        cli_update,
        "get_sample",
        lambda db, sample_id, case_id, genome_build: sample_obj,
    )
    # monkeypatch.setattr(update_sample_cmd, "parse_meta_file", lambda p: "META")

    meta_file = tmp_path / "meta.tsv"
    meta_file.write_text("type\tvalue\nA\t1\n")

    baf_file = write_sample_track(tmp_path / "baf.gz")
    cov_file = write_sample_track(tmp_path / "cov.gz")

    # assert update_sample_cmd.sample.callback is not None

    cli_update.sample.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(37),
        sample_type="tumor",
        sex=SampleSex("M"),
        baf=baf_file,
        coverage=cov_file,
        meta_file=meta_file,
        force=True,
    )

    coll = db.get_collection(SAMPLES_COLLECTION)
    doc = coll.find_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(37)}
    )
    assert doc is not None
    assert doc["sample_type"] == "tumor"
    assert doc.get("sex") in ("M", SampleSex("M"), SampleSex.MALE)
    assert Path(doc["baf_file"]) == baf_file
    assert Path(doc["coverage_file"]) == cov_file

    LOG.debug(doc)

    meta = doc.get("meta")
    assert meta is not None
    assert len(meta) == 2

    meta_by_file_name = {entry["file_name"]: entry for entry in meta}
    assert set(meta_by_file_name) == {"meta.tsv", "other.tsv"}

    updated_meta = meta_by_file_name["meta.tsv"]
    assert len(updated_meta["data"]) == 1
    assert updated_meta["data"][0]["type"] == "A"
    assert updated_meta["data"][0]["value"] == "1"
    assert updated_meta["data"][0]["row_name"] is None
    assert updated_meta["data"][0]["color"] == "rgb(0,0,0)"

    preserved_meta = meta_by_file_name["other.tsv"]
    assert len(preserved_meta["data"]) == 1
    assert preserved_meta["data"][0]["type"] == "B"
    assert preserved_meta["data"][0]["value"] == "2"


def _build_sample(sample_file: Path) -> SampleInfo:
    return SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(38),
        baf_file=sample_file,
        coverage_file=sample_file,
    )


def test_update_sample_modifies_collection(db: Any, tmp_path: Path) -> None:

    sample_file = write_sample_track(tmp_path / "sample.bed")
    sample_obj = _build_sample(sample_file)
    update_sample(db, sample_obj)

    coll = db.get_collection(SAMPLES_COLLECTION)
    doc = coll.find_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(38)}
    )

    assert doc is not None

    sample_obj.sample_type = "tumor"
