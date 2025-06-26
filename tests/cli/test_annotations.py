from __future__ import annotations

import importlib
import types
from pathlib import Path
from typing import Callable

import mongomock
import pytest
import logging

from gens.db.collections import ANNOTATION_TRACKS_COLLECTION, ANNOTATIONS_COLLECTION

LOG = logging.getLogger(__name__)


@pytest.fixture
def load_annotations_cmd() -> types.ModuleType:
    module = importlib.import_module("gens.cli.load")
    return module


def test_load_annotations_invokes_crud(
    load_annotations_cmd: types.ModuleType,
    patch_cli: Callable,
    tmp_path: Path,
    db: mongomock.Database,
):
    patch_cli(load_annotations_cmd)

    chrom = "1"
    start_pos = 0
    end_pos = 10
    label = "test_annotation"
    strand = "+"
    color = "rgb(0,0,0)"
    score = 10

    bed_file = tmp_path / "track.bed"
    bed_file.write_text(
        "\t".join(
            [chrom, str(start_pos), str(end_pos), label, str(score), strand, ".", ".", color, "5"]
        )
    )

    load_annotations_cmd.annotations.callback(
        file=bed_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)

    assert track_coll.count_documents({}) == 1
    assert annot_coll.count_documents({}) == 1
    rec = annot_coll.find_one({})
    LOG.debug(rec)
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == start_pos + 1
    assert rec["end"] == end_pos
    assert rec["name"] == label
    assert rec["color"] == [
        int(val) for val in color.replace("rgb(", "").replace(")", "").split(",")
    ]
