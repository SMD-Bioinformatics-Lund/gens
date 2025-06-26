import importlib
import json
import logging
from types import ModuleType, SimpleNamespace
from pathlib import Path
from typing import Any, Callable

import mongomock
import pytest

from gens.db.collections import CHROMSIZES_COLLECTION
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)


@pytest.fixture
def load_chromosomes_cmd() -> ModuleType:
    module = importlib.import_module("gens.cli.load")
    return module


def test_load_chromosomes_from_file(
    load_chromosomes_cmd: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    patch_cli: Callable,
):

    patch_cli(load_chromosomes_cmd)

    # Assembly data retrieved from: http://rest.ensembl.org/info/assembly/homo_sapiens?bands=true&content-type=json&synonyms=true
    # The centromeres can be retrieved from: https://www.ebi.ac.uk/ena/browser/api/embl/CM000663

    assembly_data = {
        "top_level_region": [
            {
                "name": "1",
                "length": 10,
                "coord_system": "chromosome",
                "synonyms": [{"dbname": "INSDC", "name": "CM000663.2"}],
                "centromere": {
                    "start": 3,
                    "end": 5,
                },
                "bands": [
                    {"id": "p11.1", "stain": "acen", "start": 1, "end": 2, "strand": "0"},
                    {"id": "p11.2", "stain": "gvar", "start": 4, "end": 5, "strand": "0"},
                ],
            },
            {
                "name": "X",
                "length": 8,
                "coord_system": "chromosome",
                "synonyms": [
                    {"dbname": "UCSC", "name": "chrX"},
                    {"dbname": "INSDC", "name": "CM000685.2"},
                ],
                "centromere": {
                    "start": 2,
                    "end": 4,
                },
                "bands": [
                    {"id": "p11.1", "stain": "acen", "start": 1, "end": 3, "strand": "0"},
                    {"id": "p11.2", "stain": "gvar", "start": 4, "end": 6, "strand": "0"},
                ],
            },
            {"name": "MT", "length": 5, "coord_system": "chromosome"},
        ],
        "karyotype": ["1", "X", "MT"],
    }

    json_file = tmp_path / "assembly.json"
    json_file.write_text(json.dumps(assembly_data))

    load_chromosomes_cmd.chromosomes.callback(
        genome_build=GenomeBuild(38),
        file=json_file,
        timeout=1,
    )

    chrom_coll = db.get_collection(CHROMSIZES_COLLECTION)

    assert chrom_coll.count_documents({}) == 2

    rec = chrom_coll.find_one({})
    LOG.debug(rec)

    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["genome_build"] == 38
    assert rec["size"] == 10
    assert rec["centromere"] == {"start": 3, "end": 5}
    assert len(rec["bands"]) == 2
    assert rec["bands"][0]["id"] == "p11.1"
    assert rec["bands"][0]["stain"] == "acen"
    assert rec["bands"][0]["start"] == 1
    assert rec["bands"][0]["end"] == 2
