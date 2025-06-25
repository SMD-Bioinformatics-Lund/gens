import json
from types import SimpleNamespace
from pathlib import Path

import pytest

from gens.cli.load import chromosomes as load_chromosomes_cmd, CHROMSIZES_COLLECTION
from gens.models.genomic import GenomeBuild


# class _DummyChrom:
#     def model_dump(self) -> dict[str, str]:  # pragma: no cover - simple stub
#         return {"chrom": "1"}

# def _fake_build_chromosomes_obj(*args, **kwargs):  # pragma: no cover - simple stub
#     return [_DummyChrom()]

# try:
#     import gens.load.chromosomes as chrom_mod

#     chrom_mod.build_chromosomes_obj = _fake_build_chromosomes_obj
# except Exception:
#     pass



def test_load_chromosomes_from_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, db, patch_cli):
    assembly_data = {
        "top_level_region": [
            {"name": "1", "length": 10, "coord_system": "chromosome"},
            {"name": "MT", "length": 5, "coord_system": "chromosome"},
        ],
        "karyotype": ["1", "MT"],
    }

    asm_file = tmp_path / "assembly.json"
    asm_file.write_text(json.dumps(assembly_data))

    patch_cli("gens.cli.load")
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

