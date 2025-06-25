


import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any
import pytest

from gens.models.genomic import GenomeBuild
from tests.conftest import DummyDB

from gens.cli.load import chromosomes as load_chromosomes_cmd


def test_load_chromosomes_from_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    assembly_data = {
        "top_level_region": [
            {"name": "1", "length": 10, "coord_system": "chromosome"},
            {"name": "MT", "length": 5, "coord_system": "chromosome"},
        ],
        "karyotype": ["1", "MT"],
    }

    asm_file = tmp_path / "assembly.json"
    asm_file.write_text(json.dumps(assembly_data))

    db: Any = DummyDB()

    monkeypatch.setattr(load_chromosomes_cmd, "get_db_connection", lambda conn, db_name: db)
    monkeypatch.setattr(load_chromosomes_cmd, "get_indexes", lambda db, col: [])
    monkeypatch.setattr(load_chromosomes_cmd, "create_index", lambda db, col: None)
    monkeypatch.setattr(load_chromosomes_cmd, "register_data_update", lambda db, col: None)

    called = {}

    class DummyChrom:
        def model_dump(self):
            return {"chrom": "1"}
    
    def fake_build(chrom_data, genome_build, timeout: float):
        called["chrom_data"] = chrom_data
        return [DummyChrom()]
    
    monkeypatch.setattr(load_chromosomes_cmd, "build_chromosomes_obj", fake_build)

    def fake_delete_many(query):
        called["deleted"] = query
        return SimpleNamespace(deleted_count=0)

    def fake_insert_many(records):
        called["inserted"] = records

    db.delete_many = fake_delete_many
    db.insert_many = fake_insert_many

    assert load_chromosomes_cmd.callback is not None

    load_chromosomes_cmd.callback(
        genome_build=GenomeBuild(38),
        assembly_info_file=asm_file,
        timeout=1
    )

    assert "chrom_data" in called
    assert called.get("inserted") == [{"chrom": "1"}]
