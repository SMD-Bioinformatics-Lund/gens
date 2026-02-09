"""Definition of fixtures, test data and dependency stubs."""

from __future__ import annotations

import importlib
import types
from pathlib import Path
from typing import Callable

import mongomock
import pytest
from pymongo import MongoClient


@pytest.fixture()
def data_path():
    """Get path of this file"""
    conftest_path = Path(__file__).parent / "data"
    return conftest_path


@pytest.fixture()
def aed_file_path(tmp_path: Path) -> Path:
    """Return path to a small AED file used in tests."""

    header = "\t".join(
        [
            "sequence(aed:Sequence)",
            "start(aed:Integer)",
            "end(aed:Integer)",
            "name(aed:String)",
            "color(aed:Color)",
            "note(aed:String)",
        ]
    )

    metadata = "\n".join(
        [
            "\t\t\tsource(aed:String)\tgens",
            "\t\t\tversion(aed:String)\t1",
            "\t\t\tmaintainer(aed:String)\ttest",
            "\t\t\tcomment(aed:String)\tdata",
        ]
    )

    records = "\n".join(
        [
            "chr1\t10001\t11372343\t1p36 deletion syndrome, distal\trgb(204,0,0)\tnote",
            "chr1\t20001\t30000\tsecond\trgb(0,204,0)\t-",
            "chr2\t40001\t50000\tthird\trgb(0,0,204)\t-",
            "chr3\t60001\t70000\tfourth\trgb(0,0,0)\t-",
            "chrX\t80001\t90000\tfifth\trgb(128,128,128)\t-",
        ]
    )

    file_content = "\n".join([header, metadata, records]) + "\n"

    file_path = tmp_path / "chas.aed"
    file_path.write_text(file_content)
    return file_path


@pytest.fixture()
def aed_multiline_header_path(tmp_path: Path) -> Path:
    """Return path to an AED file with a multiline header value."""

    header = "\t".join(
        [
            "sequence(aed:Sequence)",
            "start(aed:Integer)",
            "end(aed:Integer)",
            "name(aed:String)",
            "color(aed:Color)",
            "note(aed:String)",
        ]
    )

    metadata = "\n".join(
        [
            "\t\t\tsource(aed:String)\tgens",
            "\t\t\tversion(aed:String)\t1",
            "\t\t\tmaintainer(aed:String)\ttest",
            '\t\t\tinterpretation(aed:String)\t"row1\nrow2"',
        ]
    )

    records = "\n".join(
        [
            "chr1\t10001\t11372343\t1p36 deletion syndrome, distal\trgb(204,0,0)\tnote",
            "chr1\t20001\t30000\tsecond\trgb(0,204,0)\t-",
        ]
    )

    file_content = "\n".join([header, metadata, records]) + "\n"

    file_path = tmp_path / "multiline.aed"
    file_path.write_text(file_content)
    return file_path


@pytest.fixture()
def standard_bed_file_path(data_path: Path) -> Path:
    """Get path to a BED 9 file following the BED v1 spec.

    https://samtools.github.io/hts-specs/BEDv1.pdf
    """
    return data_path.joinpath("standard.9.bed")


@pytest.fixture()
def stockholm_bed_file_path(data_path: Path) -> Path:
    """Get path a bed file used by Stockholm."""
    return data_path.joinpath("stockholm.bed")


@pytest.fixture()
def meta_file_path(data_path: Path) -> Path:
    """Get path to a metadata TSV file with row names."""
    return data_path.joinpath("meta.tsv")


@pytest.fixture()
def meta_norow_file_path(data_path: Path) -> Path:
    """Get path to a metadata TSV file without row name column."""
    return data_path.joinpath("meta_norow.tsv")


@pytest.fixture()
def db() -> mongomock.Database:
    client = mongomock.MongoClient()
    return client.get_database("test")


@pytest.fixture(autouse=True)
def fail_fast_real_mongo(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail fast if a test accidentally uses a real MongoDB connection."""

    def _mongo_client_fail_fast(*args, **kwargs):
        kwargs.setdefault("serverSelectionTimeoutMS", 100)
        kwargs.setdefault("connectTimeoutMS", 100)
        kwargs.setdefault("socketTimeoutMS", 100)
        return MongoClient(*args, **kwargs)

    monkeypatch.setattr("gens.db.db.MongoClient", _mongo_client_fail_fast)


@pytest.fixture()
def patch_cli(
    monkeypatch: pytest.MonkeyPatch, db: mongomock.Database
) -> Callable[[str | types.ModuleType], None]:
    def _get_db_connection(*_args, **_kwargs):
        return db

    def _db_setup(*_args, **_kwargs):
        return db

    def _patch_target(target: str | types.ModuleType) -> None:
        if isinstance(target, str):
            monkeypatch.setattr(
                f"{target}.get_db_connection", _get_db_connection, raising=False
            )
            monkeypatch.setattr(f"{target}.db_setup", _db_setup, raising=False)
        else:
            monkeypatch.setattr(
                target, "get_db_connection", _get_db_connection, raising=False
            )
            monkeypatch.setattr(target, "db_setup", _db_setup, raising=False)

    # Patch out cli indexing commands
    def _patch(module: str | types.ModuleType) -> None:
        _patch_target(module)
        # Keep helper boundaries patched too, because CLI commands delegate DB work there.
        _patch_target("gens.cli.util.load_helpers")
        _patch_target("gens.cli.util.util")
        _patch_target("gens.db.db")

    return _patch


@pytest.fixture
def cli_load(patch_cli) -> types.ModuleType:
    module = importlib.import_module("gens.cli.load")
    patch_cli(module)
    return module


@pytest.fixture
def cli_delete(patch_cli) -> types.ModuleType:
    module = importlib.import_module("gens.cli.delete")
    patch_cli(module)
    return module


@pytest.fixture
def cli_update(patch_cli) -> types.ModuleType:
    module = importlib.import_module("gens.cli.update")
    patch_cli(module)
    return module


@pytest.fixture
def cli_index(patch_cli) -> types.ModuleType:
    module = importlib.import_module("gens.cli.index")
    patch_cli(module)
    return module
