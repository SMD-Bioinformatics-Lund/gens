import gzip
import logging
from pathlib import Path
from types import ModuleType
from typing import Any

import mongomock
import pytest

from gens.crud.samples import update_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.models.genomic import GenomeBuild
from gens.models.sample import MetaEntry, MetaValue, SampleInfo, SampleSex

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
    overview_file = tmp_path / "overview"
    overview_file.write_text("{}")
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
        overview_json=overview_file,
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
    assert Path(doc["overview_file"]) == overview_file
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


def test_load_sample_cli_with_string_genome_build_fails(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
):
    baf_file = write_sample_track(tmp_path / "baf.gz")
    cov_file = write_sample_track(tmp_path / "cov.gz")
    overview_file = tmp_path / "overview"
    overview_file.write_text("{}")
    meta_file = tmp_path / "meta.tsv"
    meta_file.write_text("type\tvalue\nA\t1\n")

    sample_coll = db.get_collection(SAMPLES_COLLECTION)

    cli_load.sample.callback(
        sample_id="sample1",
        genome_build="38",
        baf=baf_file,
        coverage=cov_file,
        case_id="case1",
        overview_json=overview_file,
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
        overview_json=overview_file,
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
    overview_file = tmp_path / "overview"
    overview_file.write_text("{}")

    cli_load.sample.callback(
        sample_id=f"sample-{alias}",
        genome_build=38,
        baf=baf_file,
        coverage=cov_file,
        case_id=f"case-{alias}",
        overview_json=overview_file,
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
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(19)}
    )

    cli_delete.sample.callback(sample_id="sample1", genome_build=19, case_id="caseA")

    assert coll.find_one({"sample_id": "sample1"}) is None


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
        data=[MetaValue(type="old", value="x")]
    )
    other_meta = MetaEntry(
        id="other-id",
        file_name="other.tsv",
        row_name_header=None,
        data=[MetaValue(type="B", value="2")]
    )
    sample_obj = SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(19),
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
        genome_build=GenomeBuild(19),
        sample_type="tumor",
        sex=SampleSex("M"),
        baf=baf_file,
        coverage=cov_file,
        meta_files=(meta_file,),
    )

    coll = db.get_collection(SAMPLES_COLLECTION)
    doc = coll.find_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(19)}
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
