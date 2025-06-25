from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

import sys
import types
import logging

from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleSex

LOG = logging.getLogger()

# Stub heavy CLI components before importing individual commands
sys.modules.setdefault("gens.cli.load", types.ModuleType("gens.cli.load"))
base_stub = types.ModuleType("gens.cli.base")
base_stub.cli = None
sys.modules.setdefault("gens.cli.base", base_stub)

from gens.cli.index import index as index_cmd


class DummyDB(dict):
    """Simple dictionary based dummy database used in CLI tests."""

    def __getitem__(self, key):  # pragma: no cover - required for indexing
        return self


def test_index_creates_indexes(monkeypatch: pytest.MonkeyPatch):
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
    
    assert index_cmd.callback is not None

    index_cmd.callback(build=True, update=False)
    assert called.get("created")


def test_index_updates_indexes(monkeypatch: pytest.MonkeyPatch):
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

    # result = runner.invoke(index_cmd, ["--update"])
    assert index_cmd.callback is not None

    index_cmd.callback(build=False, update=True)
    assert called.get("updated")


