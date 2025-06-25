from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

import sys
import types
import logging

from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleSex
from tests.conftest import DummyDB

LOG = logging.getLogger()

from gens.cli.index import index as index_cmd


def test_index_creates_indexes(monkeypatch: pytest.MonkeyPatch, dummy_db: DummyDB):
    db = dummy_db

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


