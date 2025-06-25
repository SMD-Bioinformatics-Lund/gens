from pathlib import Path
from types import SimpleNamespace
import pytest


from gens.cli.delete import sample as delete_sample_cmd
from gens.cli.update import sample as update_sample_cmd
from gens.crud.samples import delete_sample, update_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.exceptions import SampleNotFoundError
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleInfo, SampleSex
from tests.utils import my_mongomock


def test_delete_sample_invokes_crud(monkeypatch: pytest.MonkeyPatch):

    # FIXME: Generalize this stubbing - fixture?
    client = my_mongomock.MongoClient()
    db = client.get_database("test")

    def fake_get_db(connection, db_name: str):
        return db

    monkeypatch.setattr("gens.cli.delete.get_db_connection", fake_get_db)
    monkeypatch.setattr("gens.cli.delete.get_indexes", lambda db, col: [])
    monkeypatch.setattr("gens.cli.delete.create_index", lambda db, col: None)
    called = {}

    def fake_delete_sample(db: object, sample_id: str, case_id: str, genome_build):
        called["sample_id"] = sample_id
        called["case_id"] = case_id
        called["genome_build"] = genome_build

    monkeypatch.setattr("gens.cli.delete.delete_sample", fake_delete_sample)

    assert delete_sample_cmd.callback is not None

    delete_sample_cmd.callback(sample_id="sample1", genome_build=19, case_id="caseA")
    assert called == {"sample_id": "sample1", "case_id": "caseA", "genome_build": 19}


def test_update_sample_invokes_crud(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    client = my_mongomock.MongoClient()
    db = client.get_database("test")

    def fake_get_db(connection, db_name: str):
        return db

    monkeypatch.setattr("gens.cli.update.get_db_connection", fake_get_db)
    monkeypatch.setattr("gens.cli.update.get_indexes", lambda db, col: [])
    monkeypatch.setattr("gens.cli.update.create_index", lambda db, col: None)

    sample_obj = SimpleNamespace(
        sample_id="sample1", case_id="caseA", genome_build=19, sample_type=None, sex=None, meta=[]
    )

    monkeypatch.setattr("gens.cli.update.get_sample", lambda db, sample_id, case_id: sample_obj)
    captured = {}

    def fake_update_sample(db, obj):
        captured["obj"] = obj

    monkeypatch.setattr("gens.cli.update.update_sample", fake_update_sample)
    monkeypatch.setattr("gens.cli.update.parse_meta_file", lambda p: "META")

    meta_file = tmp_path / "meta.tsv"
    meta_file.write_text("type\tvalue\nA\t1\n")

    assert update_sample_cmd.callback is not None

    update_sample_cmd.callback(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(19),
        sample_type="tumor",
        sex=SampleSex("M"),
        meta_files=(meta_file,),
    )

    assert captured["obj"].sample_type == "tumor"
    sex_value = getattr(captured["obj"].sex, "value", captured["obj"].sex)
    assert sex_value == "M"
    assert "META" in captured["obj"].meta


def _build_sample() -> SampleInfo:
    return SampleInfo(
        sample_id="sample1",
        case_id="caseA",
        genome_build=GenomeBuild(38),
        baf_file=Path(__file__),
        coverage_file=Path(__file__),
    )


def test_update_sample_modifies_collection() -> None:
    client = my_mongomock.MongoClient()
    db = client.get_database("test")

    sample_obj = _build_sample()
    update_sample(db, sample_obj)

    coll = db.get_collection(SAMPLES_COLLECTION)
    doc = coll.find_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(38)}
    )

    assert doc is not None

    sample_obj.sample_type = "tumor"
    update_sample(db, sample_obj)
    updated = coll.find_one(
        {"sample_id": "sample1", "case_id": "caseA", "genome_build": GenomeBuild(38)}
    )
    assert updated["sample_type"] == "tumor"


def test_delete_sample_removes_document() -> None:
    client = my_mongomock.MongoClient()
    db = client.get_database("test")

    sample_obj = _build_sample()
    update_sample(db, sample_obj)
    coll = db.get_collection(SAMPLES_COLLECTION)
    assert coll.count_documents({}) == 1

    delete_sample(db, sample_id="sample1", case_id="caseA", genome_build=GenomeBuild(38))
    assert coll.find_one({"sample_id": "sample1"}) is None

    with pytest.raises(SampleNotFoundError):
        delete_sample(db, sample_id="sample1", case_id="caseA", genome_build=GenomeBuild(38))
