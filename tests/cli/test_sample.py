import importlib
import logging
from pathlib import Path
from types import ModuleType
from typing import Any, Callable
import mongomock
import pytest


# from gens.cli.delete import sample as delete_sample_cmd
# from gens.cli.update import sample as update_sample_cmd
# from gens.crud.samples import delete_sample, update_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.exceptions import SampleNotFoundError
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleInfo, SampleSex
# from tests.utils.my_mongomock import Database

from gens.crud.samples import update_sample, delete_sample

LOG = logging.getLogger(__name__)


@pytest.fixture
def update_sample_cmd() -> ModuleType:
    module = importlib.import_module("gens.cli.update")
    return module

@pytest.fixture
def delete_sample_cmd() -> ModuleType:
    module = importlib.import_module("gens.cli.delete")
    return module

def test_delete_sample_cli_removes_document(
    delete_sample_cmd: ModuleType,
    patch_cli: Callable,
    db: mongomock.Database,
) -> None:
    patch_cli(delete_sample_cmd)

    coll = db.get_collection(SAMPLES_COLLECTION)
    coll.insert_one(
        {
            "sample_id": "sample1",
            "case_id": "caseA",
            "genome_build": GenomeBuild(19)
        }
    )

    assert delete_sample_cmd.sample.callback is not None

    delete_sample_cmd.sample.callback(sample_id="sample1", genome_build=19, case_id="caseA")

    assert coll.find_one({"sample_id": "sample1"}) is None


def test_update_sample_updates_document(
    update_sample_cmd: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    patch_cli: Callable,
    db: mongomock.Database,
) -> None:
    patch_cli(update_sample_cmd)

    sample_obj = SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(19),
        baf_file=Path(__file__),
        coverage_file=Path(__file__),
        sample_type=None,
        sex=None,
        meta=[],
    )

    monkeypatch.setattr(update_sample_cmd, "get_sample", lambda db, sample_id, case_id: sample_obj)
    # monkeypatch.setattr(update_sample_cmd, "parse_meta_file", lambda p: "META")

    meta_file = tmp_path / "meta.tsv"
    meta_file.write_text("type\tvalue\nA\t1\n")

    assert update_sample_cmd.sample.callback is not None

    update_sample_cmd.sample.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(19),
        sample_type="tumor",
        sex=SampleSex("M"),
        meta_files=(meta_file,),
    )

    coll = db.get_collection(SAMPLES_COLLECTION)
    doc = coll.find_one({"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(19)})
    assert doc is not None
    assert doc["sample_type"] == "tumor"
    assert doc.get("sex") in ("M", SampleSex("M"), SampleSex.MALE)

    LOG.debug(doc)

    meta = doc.get("meta")
    assert meta is not None
    assert len(meta) == 1

    assert meta[0]["file_name"] == "meta.tsv"
    assert len(meta[0]["data"]) == 1
    assert meta[0]["data"][0]["type"] == "A"
    assert meta[0]["data"][0]["value"] == "1"
    assert meta[0]["data"][0]["row_name"] == None
    assert meta[0]["data"][0]["color"] == "rgb(0,0,0)"

def _build_sample() -> SampleInfo:
    return SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(38),
        baf_file=Path(__file__),
        coverage_file=Path(__file__),
    )


def test_update_sample_modifies_collection(db: Any) -> None:

    sample_obj = _build_sample()
    update_sample(db, sample_obj)

    coll = db.get_collection(SAMPLES_COLLECTION)
    doc = coll.find_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(38)}
    )

    assert doc is not None

    sample_obj.sample_type = "tumor"