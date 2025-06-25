from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from click.testing import CliRunner

import sys
import types
import logging
LOG = logging.getLogger()

# Stub heavy CLI components before importing individual commands
sys.modules.setdefault("gens.cli.load", types.ModuleType("gens.cli.load"))
base_stub = types.ModuleType("gens.cli.base")
base_stub.cli = None
sys.modules.setdefault("gens.cli.base", base_stub)

from gens.cli.delete import sample as delete_sample_cmd
from gens.cli.index import index as index_cmd
from gens.cli.update import sample as update_sample_cmd


class DummyDB(dict):
    """Simple dictionary based dummy database used in CLI tests."""

    def __getitem__(self, key):  # pragma: no cover - required for indexing
        return self


@pytest.fixture()
def runner() -> CliRunner:
    return CliRunner()


def test_index_creates_indexes(monkeypatch: pytest.MonkeyPatch, runner: CliRunner):
    db = DummyDB()

    def fake_get_db(connection, db_name: str):
        return db

    called = {}

    def fake_create_indexes(arg):
        called["created"] = True
        assert arg is db

    monkeypatch.setattr("gens.cli.index.get_db_connection", fake_get_db)
    monkeypatch.setattr("gens.cli.index.create_indexes", fake_create_indexes)
    monkeypatch.setattr("gens.cli.index.update_indexes", lambda db: 0)

    result = runner.invoke(index_cmd, ["--yes"])
    assert result.exit_code == 0
    assert called.get("created")


def test_index_updates_indexes(monkeypatch: pytest.MonkeyPatch, runner: CliRunner):
    db = DummyDB()

    def fake_get_db(connection, db_name: str):
        return db

    called = {}

    def fake_update_indexes(arg):
        called["updated"] = True
        assert arg is db
        return 1

    monkeypatch.setattr("gens.cli.index.get_db_connection", fake_get_db)
    monkeypatch.setattr("gens.cli.index.update_indexes", fake_update_indexes)
    monkeypatch.setattr("gens.cli.index.create_indexes", lambda db: None)

    result = runner.invoke(index_cmd, ["--update"])
    assert result.exit_code == 0
    assert called.get("updated")


def test_delete_sample_invokes_crud(monkeypatch: pytest.MonkeyPatch, runner: CliRunner):
    db = DummyDB()

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

    result = runner.invoke(delete_sample_cmd, [
        "--sample-id",
        "sample1",
        "--genome-build",
        "19",
        "--case-id",
        "caseA",
    ])
    assert result.exit_code == 0
    assert called == {"sample_id": "sample1", "case_id": "caseA", "genome_build": 19}


def test_update_sample_invokes_crud(monkeypatch: pytest.MonkeyPatch, runner: CliRunner, tmp_path: Path):
    db = DummyDB()

    def fake_get_db(connection, db_name: str):
        return db

    monkeypatch.setattr("gens.cli.update.get_db_connection", fake_get_db)
    monkeypatch.setattr("gens.cli.update.get_indexes", lambda db, col: [])
    monkeypatch.setattr("gens.cli.update.create_index", lambda db, col: None)

    sample_obj = SimpleNamespace(sample_id="sample1", case_id="caseA", genome_build=19, sample_type=None, sex=None, meta=[])

    monkeypatch.setattr("gens.cli.update.get_sample", lambda db, sample_id, case_id: sample_obj)
    captured = {}

    def fake_update_sample(db, obj):
        captured["obj"] = obj

    monkeypatch.setattr("gens.cli.update.update_sample", fake_update_sample)
    monkeypatch.setattr("gens.cli.update.parse_meta_file", lambda p: "META")

    meta_file = tmp_path / "meta.tsv"
    meta_file.write_text("type\tvalue\nA\t1\n")

    result = runner.invoke(update_sample_cmd, [
        "--sample-id",
        "sample1",
        "--case-id",
        "caseA",
        "--genome-build",
        "19",
        "--sample-type",
        "tumor",
        "--sex",
        "M",
        "--meta",
        str(meta_file),
    ])

    LOG.debug(result)

    assert result.exit_code == 0
    assert captured["obj"].sample_type == "tumor"
    sex_value = getattr(captured["obj"].sex, "value", captured["obj"].sex)
    assert sex_value == "M"
    assert "META" in captured["obj"].meta
