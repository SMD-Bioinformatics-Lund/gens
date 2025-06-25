import json
from types import SimpleNamespace
from pathlib import Path

import pytest

from gens.cli.load import chromosomes as load_chromosomes_cmd, CHROMSIZES_COLLECTION
from gens.models.genomic import GenomeBuild
from tests.conftest import DummyDB


# import json
# from pathlib import Path
# from types import SimpleNamespace
# from typing import Any


# from gens.cli.load import chromosomes as load_chromosomes_cmd

# import importlib
# import sys


# importlib.import_module("gens.cli")
# # sys.modules["flask"].json = json
# import gens.models.base as base_mod

# base_mod.PydanticObjectId = str
# if hasattr(base_mod.RWModel, "Config"):
#     base_mod.RWModel.Config.arbitrary_types_allowed = True
# if hasattr(base_mod.RWModel, "__config__"):
#     base_mod.RWModel.__config__.arbitrary_types_allowed = True
# load_mod = importlib.reload(importlib.import_module("gens.cli.load"))
# load_mod.json = json
# load_chromosomes_cmd = load_mod.chromosomes


def test_load_chromosomes_from_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    assembly_data = {
        "top_level_region": [
            {"name": "1", "length": 10, "coord_system": "chromosome"},
            {"name": "MT", "length": 5, "coord_system": "chromosome"},
        ],
        "karyotype": ["1", "MT"],
    }

    dummy_db = DummyDB()

    # asm_file = tmp_path / "assembly.json"
    # asm_file.write_text(json.dumps(assembly_data))

    # db: Any = DummyDB()

    monkeypatch.setattr(
        "gens.cli.load.get_db_connection",
        lambda conn, db_name: dummy_db
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
    
    dummy_db[CHROMSIZES_COLLECTION] = FakeColl()

    assert load_chromosomes_cmd.callback is not None

    load_chromosomes_cmd.callback(
        genome_build=GenomeBuild(38),
        timeout=1
    )

    assert called["deleted"] == {"genome_build": 38}

    assert called["inserted"] == [{"chrom": "1"}]



    # class DummyChrom:
    #     def model_dump(self):
    #         return {"chrom": "1"}

    # def fake_build(chrom_data, genome_build, timeout: float):
    #     called["chrom_data"] = chrom_data
    #     return [DummyChrom()]

    # monkeypatch.setattr(load_mod, "build_chromosomes_obj", fake_build)

    # def fake_delete_many(query):
    #     called["deleted"] = query
    #     return SimpleNamespace(deleted_count=0)

    # def fake_insert_many(records):
    #     called["inserted"] = records

    # db.delete_many = fake_delete_many
    # db.insert_many = fake_insert_many

    # assert load_chromosomes_cmd.callback is not None

    # load_chromosomes_cmd.callback(
    #     genome_build=GenomeBuild(38), assembly_info_file=asm_file, timeout=1
    # )

    # assert "chrom_data" in called
    # assert called.get("inserted") == [{"chrom": "1"}]
