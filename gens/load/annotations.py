"""Annotations."""

import csv
import logging
import re
from pathlib import Path
from typing import Any, Iterator

from pymongo import ASCENDING
from pymongo.database import Database

from gens.db import ANNOTATIONS_COLLECTION
from gens.models.annotation import AnnotationRecord
from gens.models.genomic import Chromosome, GenomeBuild

LOG = logging.getLogger(__name__)
FIELD_TRANSLATIONS = {
    "chromosome": "sequence",
    "position": "start",
    "stop": "end",
    "chromstart": "start",
    "chromend": "end",
}
CORE_FIELDS = ("sequence", "start", "end", "name", "strand", "color", "score")
AED_ENTRY = re.compile(r"[.+:]?(\w+)\(\w+:(\w+)\)", re.I)

DEFAULT_COLOR = "grey"


class ParserError(Exception):
    """Parser errors."""


def parse_bed(file: Path) -> Iterator[dict[str, str]]:
    """Parse bed file."""
    with open(file, encoding="utf-8") as bed:
        bed_reader = csv.DictReader(
            bed,
            fieldnames=[
                "sequence",
                "start",
                "end",
                "name",
                "score",
                "strand",
                "thickStart",
                "thickEnd",
                "color",
                "block_count",
                "block_sizes",
                "block_starts",
            ],
            delimiter="\t",
        )

        # Load in annotations
        for line in bed_reader:
            # skip comment lines
            if line["sequence"].startswith("#"):
                continue
            yield line


def parse_aed(file: Path) -> Iterator[dict[str, str]]:
    """Parse aed file."""
    header: dict[str, str] = {}
    with open(file, encoding='utf-8') as aed:
        aed_reader = csv.reader(aed, delimiter="\t")

        # Parse the aed header and get the keys and data formats
        for head in next(aed_reader):

            matches = re.search(AED_ENTRY, head)
            if matches is None:
                raise ValueError(
                    f"Expected to find {AED_ENTRY} in {head}, but did not succeed"
                )

            field, data_type = matches.groups()
            header[field] = data_type.lower()

        # iterate over file content
        for line in aed_reader:
            if any("(aed:" in l for l in line):
                continue
            yield dict(zip(header, line))


def parse_annotation_entry(
    entry: dict[str, str], genome_build: GenomeBuild, annotation_name: str
) -> AnnotationRecord:
    """Parse a bed or aed entry"""
    annotation: dict[str, str | int] = {}
    # parse entry and format the values
    for name, value in entry.items():
        name = name.strip("#").lower()
        if name in FIELD_TRANSLATIONS:
            name = FIELD_TRANSLATIONS[name]
        if name in CORE_FIELDS:
            name = "chrom" if name == "sequence" else name  # for compatibility
            try:
                annotation[name] = format_data(name, value)
            except ValueError as err:
                LOG.debug("Bad line: %s", entry)
                raise ParserError(str(err)) from err

    # ensure that coordinates are in correct order
    annotation["start"], annotation["end"] = sorted(
        [annotation["end"], annotation["start"]]
    )
    # set missing fields to default values
    set_missing_fields(annotation, annotation_name)
    # set additional values
    return AnnotationRecord(
        source=annotation_name,
        genome_build=genome_build,
        **annotation,
    )


def format_data(name: str, value: str) -> str | int:
    """Formats the data depending on title"""
    if name == "color":
        if not value:
            return DEFAULT_COLOR
        elif value.startswith("rgb("):
            return value
        else:
            return f"rgb({value})"
    elif name == "chrom":
        if not value:
            raise ValueError(f"field {name} must exist")
        return value.strip("chr")
    elif name == "start" or name == "end":
        if not value:
            raise ValueError(f"field {name} must exist")
        return int(value)
    elif name == "score":
        return int(value) if value else ""
    else:
        return value


def set_missing_fields(annotation: dict[str, str | int], name: str):
    """Sets default values to fields that are missing"""
    for field_name in CORE_FIELDS:
        if field_name in annotation:
            continue

        if field_name == "color":
            annotation[field_name] = DEFAULT_COLOR
        elif field_name == "score":
            annotation[field_name] = "None"
        elif field_name in ["sequence", "strand"]:
            pass
        else:
            LOG.warning(
                "field %s is missing from annotation %s in file %s",
                field_name, annotation, name
            )


def update_height_order(db: Database, name: str):
    """Updates height order for annotations.

    Height order is used for annotation placement
    """
    for chrom in Chromosome:
        annotations = (
            db[ANNOTATIONS_COLLECTION]
            .find({"chrom": chrom.value, "source": name})
            .sort([("start", ASCENDING)])
        )

        height_tracker = [-1] * 200
        current_height = 1
        for annot in annotations:
            while True:
                if int(annot["start"]) > height_tracker[current_height - 1]:
                    # Add height to DB
                    db[ANNOTATIONS_COLLECTION].update_one(
                        {"_id": annot["_id"], "source": annot["source"]},
                        {"$set": {"height_order": current_height}},
                    )

                    # Keep track of added height order
                    height_tracker[current_height - 1] = int(annot["end"])

                    # Start from the beginning
                    current_height = 1
                    break

                current_height += 1
                # Extend height tracker
                if len(height_tracker) < current_height:
                    height_tracker += [-1] * 100


def parse_annotation_file(file: Path, file_format: str) -> Iterator[dict[str, str]]:
    """Parse an annotation file in bed or aed format."""
    if file_format == "bed":
        return parse_bed(file)
    if file_format == "aed":
        return parse_aed(file)

    raise ValueError(f"Unknown file format: {file_format}")
