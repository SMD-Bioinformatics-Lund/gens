import json
from types import SimpleNamespace
from pathlib import Path

import pytest

from gens.cli.load import chromosomes as load_chromosomes_cmd, CHROMSIZES_COLLECTION
from gens.models.genomic import GenomeBuild
from tests.conftest import DummyDB
from tests.utils import mongomock


def test_load_chromosomes_from_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    assembly_data = {
        "top_level_region": [
            {"name": "1", "length": 10, "coord_system": "chromosome"},
            {"name": "MT", "length": 5, "coord_system": "chromosome"},
        ],
        "karyotype": ["1", "MT"],
    }

    client = mongomock.MongoClient()
    db = client.get_database("test")

    asm_file = tmp_path / "assembly.json"
    asm_file.write_text(json.dumps(assembly_data))

    # db: Any = DummyDB()

    monkeypatch.setattr(
        "gens.cli.load.get_db_connection",
        lambda conn, db_name: db
    )
    monkeypatch.setattr(
        "gens.cli.load.get_indexes",
        lambda db, col: []
    )
    monkeypatch.setattr(
        "gens.cli.load.create_index",
        lambda db, col: None
    )
    monkeypatch.setattr(
        "gens.cli.load.register_data_update",
        lambda db, col: None
    )
    monkeypatch.setattr(
        "gens.cli.load.get_assembly_info",
        lambda gb, timeout: assembly_data
    )

    called = {}

    class FakeColl:
        def delete_many(self, query):
            called["deleted"] = query
            return SimpleNamespace(deleted_count=0)
        def insert_many(self, records):
            called["inserted"] = records
    
    db[CHROMSIZES_COLLECTION] = FakeColl()

    assert load_chromosomes_cmd.callback is not None

    load_chromosomes_cmd.callback(
        genome_build=GenomeBuild(38),
        file=str(asm_file),
        timeout=10,
    )

    assert called["deleted"] == {"genome_build": 38}
    assert called["inserted"] == [{"chrom": "1"}]

