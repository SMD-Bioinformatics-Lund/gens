"""Test cli commands."""

import pytest
import mongomock
from pathlib import Path
from click.testing import CliRunner
from gens.commands.load import annotations

@mongomock.patch(servers=(('mongodb', 27017),))
@pytest.mark.parametrize('fixture_name,n_annotations,genome_build', [
    ('aed_file_path', 2, 38), 
])
def test_load_annotation(fixture_name: str, n_annotations: int, genome_build: int, request):
    """Test load annotation file to the database."""
    # get annotation file path
    input_file: Path = request.getfixturevalue(fixture_name)

    # run cli command
    runner = CliRunner()
    args = ['--file', str(input_file), '--genome-build', str(genome_build)]
    result = runner.invoke(annotations, args)

    # Test that the command finished sucessfully
    assert result.exit_code == 0