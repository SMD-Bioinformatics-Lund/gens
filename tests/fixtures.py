"""Various fixtures and test files."""

from pathlib import Path
import types
from typing import Callable

import mongomock
import pytest


@pytest.fixture()
def data_path():
    """Get path of this file"""
    conftest_path = Path(__file__).parent / "data"
    return conftest_path


@pytest.fixture()
def aed_file_path(data_path: Path) -> Path:
    """Get path to AED test file from Chas."""
    return data_path.joinpath("chas.aed")


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


@pytest.fixture()
def patch_cli(
    monkeypatch: pytest.MonkeyPatch, db
) -> Callable[[str | types.ModuleType], None]:
    
    # Patch out cli indexing commands
    def _patch(module: str | types.ModuleType) -> None:
        if isinstance(module, str):
            monkeypatch.setattr(
                f"{module}.get_db_connection", lambda *a, **kw: db
            )
            monkeypatch.setattr(f"{module}.get_indexes", lambda *a, **kw: [])
            monkeypatch.setattr(f"{module}.create_index", lambda *a, **kw: None)
        else:
            monkeypatch.setattr(module, "get_db_connection", lambda *a, **kw: db)
            monkeypatch.setattr(module, "get_indexes", lambda *a, **kw: [])
            monkeypatch.setattr(module, "create_index", lambda *a, **kw: None)
    return _patch
