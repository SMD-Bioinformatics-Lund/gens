import json
from types import SimpleNamespace
from pathlib import Path

import mongomock
import pytest

from gens.cli.load import chromosomes as load_chromosomes_cmd, CHROMSIZES_COLLECTION
from gens.models.genomic import GenomeBuild


def test_load_chromosomes_from_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, db: mongomock.Database, patch_cli
):
    assembly_data = {
        "top_level_region": [
            {"name": "1", "length": 10, "coord_system": "chromosome"},
            {"name": "MT", "length": 5, "coord_system": "chromosome"},
        ],
        "karyotype": ["1", "MT"],
    }

    monkeypatch.setattr("gens.cli.load.get_assembly_info", lambda gb, timeout: assembly_data)

    assert load_chromosomes_cmd.callback is not None

    load_chromosomes_cmd.callback(
        genome_build=GenomeBuild(38),
        timeout=1,
    )

    docs = list(db[CHROMSIZES_COLLECTION].find({}, {"_id": 0}))

    expected = [
        {"chromosome": "1", "length": 10, "genome_build": 38},
        {"chromosome": "MT","length":  5, "genome_build": 38}
    ]
    # adjust the keys to match exactly what build_chromosomes_obj emits:
    simplified = [
        {"chromosome": d["name"], "length": d["length"], "genome_build": d["genome_build"]}
        for d in docs
    ]
    assert sorted(simplified, key=lambda x: x["chromosome"]) == sorted(expected, key=lambda x: x["chromosome"])