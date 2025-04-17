"""Test cli commands."""

from pathlib import Path

import mongomock
import pytest
from click.testing import CliRunner

from gens.cli.load import annotations

MONGO_HOST = "mongodb"
MONGO_PORT = 27017


@mongomock.patch(servers=((MONGO_HOST, MONGO_PORT),))
@pytest.mark.parametrize(
    "fixture_name,genome_build",
    [
        ("aed_file_path", 19),
        ("aed_file_path", 38),
        ("standard_bed_file_path", 19),
        ("standard_bed_file_path", 38),
        ("stockholm_bed_file_path", 19),
        ("stockholm_bed_file_path", 38),
    ],
)
def test_load_annotation(fixture_name: str, genome_build: int, request):
    """Test load annotation file to the database."""
    # get annotation file path
    input_file: Path = request.getfixturevalue(fixture_name)

    runner = CliRunner()
    args = ["--file", str(input_file), "--genome-build", str(genome_build)]
    # add header flag if input file are of the stockholm dialect
    if "stockholm" in fixture_name:
        args.append("--tsv")

    # run cli command
    result = runner.invoke(annotations, args)

    # Test that the command finished sucessfully
    assert result.exit_code == 0
