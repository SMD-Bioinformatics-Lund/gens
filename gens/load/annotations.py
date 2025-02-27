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
FIELD_TRANSLATIONS: dict[str, str] = {
    "chromosome": "chrom",
    "sequence": "chrom",
    "position": "start",
    "stop": "end",
    "chromstart": "start",
    "chrom_start": "start",
    "chromend": "end",
    "chrom_end": "end",
}
CORE_FIELDS = ("sequence", "start", "end", "name", "strand", "color", "score")
AED_ENTRY = re.compile(r"[.+:]?(\w+)\(\w+:(\w+)\)", re.I)

DEFAULT_COLOUR = "grey"

RGB_COLOR = tuple[int, int, int]
RGBA_COLOR = tuple[int, int, int, float]


class ParserError(Exception):
    """Parser errors."""


def read_bed(file: Path, header: bool = False) -> Iterator[dict[str, str]]:
    """
    Read bed file. If header == True is the first data row used as header instead.
    """
    with open(file, encoding="utf-8") as bed:
        field_names = [
            "chrom",
            "chrom_start",
            "chrom_end",
            "name",
            "score",
            "strand",
            "thick_start",
            "thick_end",
            "item_rgb",
            "block_count",
            "block_sizes",
            "block_starts",
        ]
        bed_reader = csv.reader(bed, delimiter="\t")
        colnames: list[str] | None = None
        # Load in annotations
        for line in bed_reader:
            # skip comments, lines starting with # sign
            if line[0].startswith("#"):
                continue
            # define the header
            if colnames is None:
                colnames = (
                    [col.lower() for col in line]
                    if header
                    else field_names[: len(line)]
                )
                continue

            if len(line) != len(colnames):
                raise ValueError(
                    (
                        f"Too few columns. Expected {len(colnames)}, "
                        f"got {len(line)}; line: {line}"
                    )
                )
            yield dict(zip(colnames, line))


def read_aed(file: Path) -> Iterator[dict[str, str]]:
    """Read aed file."""
    header: dict[str, str] = {}
    with open(file, encoding="utf-8") as aed:
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
) -> AnnotationRecord | None:
    """Parse a bed or aed entry"""
    annotation: dict[str, Any] = {}
    # parse entry and format the values
    for colname, value in entry.items():
        # translate name, default to existing name if not in tr table
        new_colname = FIELD_TRANSLATIONS.get(colname, colname)

        # cast values into expected type
        try:
            annotation[new_colname] = format_data(new_colname, value)
        except ValueError as err:
            LOG.debug("Bad line: %s", entry)
            raise ParserError(str(err)) from err

    # ensure that coordinates are in correct order
    annotation["start"], annotation["end"] = sorted(
        [annotation["end"], annotation["start"]]
    )
    try:
        return AnnotationRecord(
            source=annotation_name,
            genome_build=genome_build,
            **annotation,
        )
    except Exception as err:
        print(err)
        print(annotation)

    return None


def format_colour(colour_value: str | None) -> RGB_COLOR | RGBA_COLOR | str:
    """Format colour to rgb."""

    if colour_value is None:
        return DEFAULT_COLOUR
    elif colour_value.startswith("rgb("):
        return colour_value

    # parse rgb tuples
    rgba_match = re.match(r"(\d+) (\d+) (\d+) / (\d+)%", colour_value)
    rgb_match = re.match(r"(\d+) (\d+) (\d+)", colour_value)
    if rgba_match:
        return tuple([
            int(rgba_match.group(1)),
            int(rgba_match.group(2)),
            int(rgba_match.group(3)),
            float(int(rgba_match.group(4)) / 100),
        ])
    elif rgb_match:
        return tuple([int(gr) for gr in rgb_match.groups()])

    return DEFAULT_COLOUR


def format_data(data_type: str, value: str) -> str | int | RGBA_COLOR | RGB_COLOR | None:
    """Parse the data based on its type."""
    new_value = None if value == "." else value
    if data_type == "color":
        return format_colour(new_value)
    elif data_type == "chrom":
        if not new_value:
            raise ValueError(f"field {data_type} must exist")
        return new_value.strip("chr")
    elif data_type == "start" or data_type == "end":
        if not new_value:
            raise ValueError(f"field {data_type} must exist")
        return int(new_value)
    elif data_type == "score":
        return int(new_value) if new_value else None
    elif data_type == "strand":
        return "." if new_value is None else new_value
    else:
        return new_value


def set_missing_fields(annotation: dict[str, str | int | None], name: str):
    """Sets default values to fields that are missing"""
    for field_name in CORE_FIELDS:
        if field_name in annotation:
            continue

        if field_name == "color":
            annotation[field_name] = DEFAULT_COLOUR
        elif field_name in "score":
            annotation[field_name] = None
        elif field_name in "strand":
            annotation[field_name] = "."  # default to bed null value
        elif field_name == "sequence":
            continue
        else:
            LOG.warning(
                "field %s is missing from annotation %s in file %s",
                field_name,
                annotation,
                name,
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


def read_annotation_file(
    file: Path, file_format: str, has_header: bool = False
) -> Iterator[dict[str, str]]:
    """Parse an annotation file in bed or aed format."""
    if file_format == "bed":
        return read_bed(file, has_header)
    if file_format == "aed":
        return read_aed(file)

    raise ValueError(f"Unknown file format: {file_format}")
