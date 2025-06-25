from pathlib import Path
from types import SimpleNamespace
import pytest


from gens.cli.delete import sample as delete_sample_cmd
from gens.cli.update import sample as update_sample_cmd
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleSex
from tests.conftest import DummyDB


def test_delete_sample_invokes_crud(monkeypatch: pytest.MonkeyPatch, dummy_db: DummyDB):
    db = dummy_db

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
    db = DummyDB()

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
