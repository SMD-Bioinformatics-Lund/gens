"""Various fixtures and test files."""

from pathlib import Path

import pytest


@pytest.fixture()
def data_path():
    """Get path of this file"""
    conftest_path = Path(__file__)
    return conftest_path.parent


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
