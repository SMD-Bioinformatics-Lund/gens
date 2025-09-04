from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType

import mongomock
import pytest

from gens.db.collections import ANNOTATION_TRACKS_COLLECTION, ANNOTATIONS_COLLECTION

LOG = logging.getLogger(__name__)


@dataclass
class AnnotEntry:
    chrom: str
    start_pos: int
    end_pos: int
    label: str
    strand: str
    color: str
    score: int


@pytest.fixture
def annot_entry() -> AnnotEntry:
    entry = AnnotEntry(
        chrom="1",
        start_pos=0,
        end_pos=10,
        label="test_annotation",
        strand="+",
        color="rgb(0,0,0)",
        score=10,
    )
    return entry


def test_load_annotations_from_bed(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    bed_file = tmp_path / "track.bed"
    bed_file.write_text(
        "\t".join(
            [
                annot_entry.chrom,
                str(annot_entry.start_pos),
                str(annot_entry.end_pos),
                annot_entry.label,
                str(annot_entry.score),
                annot_entry.strand,
                ".",
                ".",
                annot_entry.color,
            ]
        )
    )

    cli_load.annotations.callback(
        file=bed_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    assert track_coll.count_documents({}) == 1
    track_info = track_coll.find_one({})
    assert track_info is not None
    assert track_info["name"] == "track"
    assert track_info["description"] == ""
    assert track_info["maintainer"] is None
    assert track_info["metadata"] == []
    assert track_info["genome_build"] == 38

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    assert annot_coll.count_documents({}) == 1
    rec = annot_coll.find_one({})
    LOG.debug(rec)
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == annot_entry.start_pos + 1
    assert rec["end"] == annot_entry.end_pos
    assert rec["name"] == annot_entry.label
    assert rec["color"] == [0, 0, 0]


def test_load_annotations_from_tsv(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    header = "\t".join(["Chromosome", "Start", "Stop", "Name", "Color"])
    content = "\t".join(
        [
            annot_entry.chrom,
            str(annot_entry.start_pos),
            str(annot_entry.end_pos),
            annot_entry.label,
            annot_entry.color,
        ]
    )

    file_content = "\n".join([header, content])

    tsv_file = tmp_path / "track.tsv"
    tsv_file.write_text(file_content)

    cli_load.annotations.callback(
        file=tsv_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    track_info = track_coll.find_one({})
    assert track_info is not None
    assert track_info["name"] == "track"
    assert track_info["description"] == ""
    assert track_info["maintainer"] == None
    assert track_info["metadata"] == []
    assert track_info["genome_build"] == 38

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    assert track_coll.count_documents({}) == 1
    assert annot_coll.count_documents({}) == 1
    rec = annot_coll.find_one({})
    LOG.debug(rec)
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == annot_entry.start_pos + 1
    assert rec["end"] == annot_entry.end_pos
    assert rec["name"] == annot_entry.label
    assert rec["color"] == [0, 0, 0]


def test_load_annotations_from_tsv_with_comments(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    header = "\t".join(
        [
            "Chromosome",
            "Start",
            "Stop",
            "Name",
            "Color",
            "Comments",
        ]
    )
    content = "\t".join(
        [
            annot_entry.chrom,
            str(annot_entry.start_pos),
            str(annot_entry.end_pos),
            annot_entry.label,
            annot_entry.color,
            "a comment; another comment",
        ]
    )

    file_content = "\n".join([header, content])

    tsv_file = tmp_path / "track.tsv"
    tsv_file.write_text(file_content)

    cli_load.annotations.callback(
        file=tsv_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    rec = annot_coll.find_one({})
    assert rec is not None
    assert len(rec["comments"]) == 2
    assert rec["comments"][0]["comment"] == "a comment"
    assert rec["comments"][1]["comment"] == "another comment"


def test_load_annotations_parses_aed(
    cli_load: ModuleType,
    aed_file_path: Path,
    db: mongomock.Database,
):

    cli_load.annotations.callback(
        file=aed_file_path,
        genome_build=38,
        is_tsv=False,
        ignore_errors=True,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    assert track_coll.count_documents({}) == 1
    track_info = track_coll.find_one({})

    assert track_info is not None
    assert track_info["name"] == "chas"
    assert track_info["description"] == ""
    assert track_info["maintainer"] is None
    assert len(track_info["metadata"]) == 4
    assert track_info["genome_build"] == 38

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    assert annot_coll.count_documents({}) == 5
    rec = annot_coll.find_one({})
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == 10001
    assert rec["end"] == 11372343
    assert rec["name"] == "1p36 deletion syndrome, distal"
    assert rec["color"] == [204, 0, 0]


def test_load_annotations_from_directory(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    bed1 = tmp_path / "track1.bed"
    bed2 = tmp_path / "track2.bed"
    bed_line = "\t".join(
        [
            annot_entry.chrom,
            str(annot_entry.start_pos),
            str(annot_entry.end_pos),
            annot_entry.label,
            str(annot_entry.score),
            annot_entry.strand,
            ".",
            ".",
            annot_entry.color,
        ]
    )
    bed1.write_text(bed_line)
    bed2.write_text(bed_line)

    cli_load.annotations.callback(
        file=tmp_path,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)

    assert track_coll.count_documents({}) == 2
    assert annot_coll.count_documents({}) == 2


def test_delete_annotation_cli_removes_documents(
    cli_delete: ModuleType,
    db: mongomock.Database,
) -> None:
    tracks = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    annots = db.get_collection(ANNOTATIONS_COLLECTION)

    res = tracks.insert_one(
        {
            "name": "track1",
            "description": "",
            "maintainer": None,
            "metadata": [],
            "genome_build": 38,
        }
    )

    annots.insert_one(
        {
            "track_id": res.inserted_id,
            "name": "rec",
            "chrom": "1",
            "start": 1,
            "end": 10,
            "genome_build": 38,
            "color": [0, 0, 0],
            "description": None,
            "comments": [],
            "references": [],
            "metadata": [],
        }
    )

    cli_delete.annotation.callback(genome_build=38, name="track1")

    assert tracks.count_documents({}) == 0
    assert annots.count_documents({}) == 0
