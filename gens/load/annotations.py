"""Annotations."""
import csv
import logging
from pathlib import Path
import re
from typing import Iterator

from mongomock import MongoClient
from pymongo import ASCENDING

from gens.constants import CHROMOSOMES
from gens.db import ANNOTATIONS_COLLECTION

LOG = logging.getLogger(__name__)
FIELD_TRANSLATIONS = {
    "chromosome": "sequence",
    "position": "start",
    "stop": "end",
    "chromstart": "start",
    "chromend": "end"
}
CORE_FIELDS = ("sequence", "start", "end", "name", "strand", "color", "score")
AED_ENTRY = re.compile(r"[.+:]?(\w+)\(\w+:(\w+)\)", re.I)

DEFAULT_COLOR = "grey"


class ParserError(Exception):
    pass


def parse_bed(file: Path) -> Iterator[dict[str, str]]:
    """Parse bed file."""
    with open(file, encoding='utf-8') as bed:
        bed_reader = csv.DictReader(bed, fieldnames=['sequence', 'start', 'end', 'name', 'score', 'strand', 'thickStart', 'thickEnd', 'color', 'block_count', 'block_sizes', 'block_starts'], delimiter="\t")

        # Load in annotations
        for line in bed_reader:
            # skip comment lines
            if line['sequence'].startswith('#'):
                continue
            yield line


def parse_aed(file: Path) -> Iterator[dict[str, str]]:
    """Parse aed file."""
    header: dict[str, str] = {}
    with open(file) as aed:
        aed_reader = csv.reader(aed, delimiter="\t")

        # Parse the aed header and get the keys and data formats
        for head in next(aed_reader):

            matches = re.search(AED_ENTRY, head)
            if matches is None:
                raise ValueError(f"Expected to find {AED_ENTRY} in {head}, but did not succeed")

            field, data_type = matches.groups()
            header[field] = data_type.lower()

        # iterate over file content
        for line in aed_reader:
            if any("(aed:" in l for l in line):
                continue
            yield dict(zip(header, line))


def parse_annotation_entry(entry: dict[str, str], genome_build: int, annotation_name: str) -> dict[str, str|int]:
    """Parse a bed or aed entry"""
    annotation: dict[str, str|int] = {}
    # parse entry and format the values
    for name, value in entry.items():
        name = name.strip("#")
        name = name.lower()
        if name in FIELD_TRANSLATIONS:
            name = FIELD_TRANSLATIONS[name]
        if name in CORE_FIELDS:
            name = "chrom" if name == "sequence" else name  # for compatibility
            try:
                annotation[name] = format_data(name, value)
            except ValueError as err:
                LOG.debug(f"Bad line: {entry}")
                raise ParserError(str(err))

    # ensure that coordinates are in correct order
    annotation["start"], annotation["end"] = sorted(
        [annotation["end"], annotation["start"]]
    )
    # set missing fields to default values
    set_missing_fields(annotation, annotation_name)
    # set additional values
    annotation = {
        "source": annotation_name,
        "genome_build": genome_build,
        **annotation,
    }
    return annotation


def format_data(name: str, value: str) -> str|int:
    """Formats the data depending on title"""
    if name == "color":
        if not value:
            fmt_val = DEFAULT_COLOR
        elif value.startswith("rgb("):
            fmt_val = value
        else:
            fmt_val = f"rgb({value})"
    elif name == "chrom":
        if not value:
            raise ValueError(f"field {name} must exist")
        fmt_val = value.strip("chr")
    elif name == "start" or name == "end":
        if not value:
            raise ValueError(f"field {name} must exist")
        fmt_val = int(value)
    elif name == "score":
        fmt_val = int(value) if value else ""
    else:
        fmt_val = value
    return fmt_val


def set_missing_fields(annotation: dict[str, str|int], name: str):
    """Sets default values to fields that are missing"""
    for field_name in CORE_FIELDS:
        if field_name in annotation:
            continue
        elif field_name == "color":
            annotation[field_name] = DEFAULT_COLOR
        elif field_name == "score":
            annotation[field_name] = "None"
        elif field_name == "sequence" or field_name == "strand":
            pass
        else:
            LOG.warning(
                f"field {field_name} is missing from annotation {annotation} in file {name}"
            )


def update_height_order(db: MongoClient, name: str):
    """Updates height order for annotations.

    Height order is used for annotation placement
    """
    for chrom in CHROMOSOMES:
        annotations = (
            db[ANNOTATIONS_COLLECTION]
            .find({"chrom": chrom, "source": name})
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
