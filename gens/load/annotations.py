"""Annotations."""

import csv
import logging
import re
from datetime import datetime
from io import TextIOWrapper
from pathlib import Path
from typing import Any, Iterator, Optional

from pydantic import AnyHttpUrl, BaseModel, ValidationError
from pydantic_core import PydanticCustomError
from pydantic_extra_types.color import Color

from gens.models.annotation import (
    AnnotationRecord,
    Comment,
    DatetimeMetadata,
    DnaStrandMetadata,
    GenericMetadata,
    ReferenceUrl,
    ScientificArticle,
    UrlMetadata,
)
from gens.models.base import PydanticObjectId
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
    "item_rgb": "color",
}
BED_CORE_FIELDS = ("sequence", "start", "end", "name", "strand", "color", "score")
AED_ENTRY = re.compile(r"[.+:]?(\w+)\(\w+:(\w+)\)", re.I)
AED_URL_REFERENCE_NOTE = re.compile(r"(\w+).+\((.+)\)", re.I)
AED_PMID_REFERENCE_NOTE = re.compile(r"(\w+).+\(PMID:\s+(\d+).+\)", re.I)

DEFAULT_COLOUR = "grey"


class ParserError(Exception):
    """Parser errors."""


class AedPropertyDefinition(BaseModel):
    """Definition of a column or metadata point in a AED file."""

    prefix: str
    name: str
    type: str


def parse_bed_file(file: Path) -> Iterator[dict[str, str]]:
    """
    Read bed file. No header is expected.
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
                colnames = field_names[: len(line)]

            if len(line) != len(colnames):
                raise ValueError(
                    (
                        f"Incorrect number of columns. Expected {len(colnames)}, "
                        f"got {len(line)}; line: {line}"
                    )
                )
            yield dict(zip(colnames, line))


def set_missing_fields(annotation: dict[str, str | int | None], name: str) -> None:
    """Sets default values to fields that are missing"""
    for field_name in BED_CORE_FIELDS:
        if field_name in annotation or field_name == "sequence":
            continue

        if field_name == "color":
            annotation[field_name] = DEFAULT_COLOUR
        elif field_name in "score":
            annotation[field_name] = None
        elif field_name in "strand":
            annotation[field_name] = "."  # default to bed null value


def fmt_bed_to_annotation(
    entry: dict[str, str],
    track_id: PydanticObjectId,
    genome_build: GenomeBuild,
) -> AnnotationRecord:
    """Parse a bed or aed entry"""

    annotation: dict[str, Any] = {}
    if len(entry) < len(BED_CORE_FIELDS):
        fields_in_row = "\t".join(entry.values())
        raise ValueError(f"Malformad entry in BED file!, row: {fields_in_row}")
    for colname, value in entry.items():
        new_colname = FIELD_TRANSLATIONS.get(colname, colname)
        try:
            annotation[new_colname] = format_bed_data(new_colname, value)
        except ValueError as err:
            LOG.info("Bad line: %s", entry)
            raise ParserError(str(err)) from err

    return AnnotationRecord(
        track_id=track_id,
        name="The Nameless One" if annotation["name"] is None else annotation["name"],
        genome_build=genome_build,
        chrom=annotation["chrom"],
        start=annotation["start"],
        end=annotation["end"],
        color=annotation["color"],
    )


def _is_metadata_row(line: str) -> bool:
    """Check if a ChAS header row contains metadata definition.

    The first three columns in a ChaS metadata row are empty.
    """
    row = line.rstrip().split("\t")
    indent_len = 0
    for col in row:
        if col == "":
            indent_len += 1
        else:
            break
    return indent_len == 3


def peek_line(fh: TextIOWrapper) -> str:
    """Look at the next line without advancing the file handle."""
    pos = fh.tell()
    line = fh.readline()
    fh.seek(pos)
    return line


def _parse_aed_property(property_def: str) -> AedPropertyDefinition:
    """Parse property names from AED files and return prefix, name and type.

    E.g. aed:name(aed:String) -> {prefix: aed, name: name, type: str}
    """
    match = re.search(r"(?:(\w+):)?(\w+)\((.+)\)", property_def)
    if match is None:
        raise ValueError(f"Unknown AED property, {property_def}")
    prefix, name, type = match.groups()
    return AedPropertyDefinition(prefix=prefix or "no_prefix", name=name, type=type)


AedDatatypes = str | int | bool | datetime | Color | AnyHttpUrl
AedFileMetadata = list[dict[str, AedDatatypes]]
AedRecord = dict[str, AedDatatypes | None]
AedRecords = list[AedRecord]


def format_aed_entry(value: str, format: str) -> AedDatatypes:
    """Format a aed entry using the definition from the header."""
    match format:
        case "aed:String":
            return value
        case "aed:Integer":
            try:
                return int(value)
            except ValueError:
                LOG.warning(f"Unable to parse {value} to integer, returning as string")
                return str(value)
        case "aed:Boolean":
            return bool(value)
        case "aed:URI":
            try:
                return AnyHttpUrl(value)
            except ValueError:
                LOG.warning(f"Unable to parse {value} to URI, returning as string")
                return str(value)
        case "aed:DateTime":
            try:
                return datetime.fromisoformat(value)
            except ValueError:
                LOG.warning(f"Unable to parse {value} to datetime, returning as string")
                return str(value)
        case "aed:Color":
            try:
                return Color(value)
            except PydanticCustomError:
                LOG.warning(
                    f"Color could not be parsed correctly, returning string as is for value: {value}"
                )
                return str(value)
        case _ if format.startswith("aed:"):
            return value
        case _:
            LOG.warning(f"Unknown format: {format}, returning value as is ({value})")
            return value


def _parse_aed_header(
    fh: TextIOWrapper,
) -> tuple[dict[int, AedPropertyDefinition], AedFileMetadata]:
    """Parse aed header and metadata rows to get column definitions.

    Retrun definition of the columns and metadata on the track encoded in the header.
    """
    # get column definition
    raw_header = fh.readline().rstrip().split("\t")
    col_def: dict[int, AedPropertyDefinition] = {
        col_no: _parse_aed_property(col) for col_no, col in enumerate(raw_header)
    }
    # parse optional metadata
    file_metadata: list[dict[str, AedDatatypes]] = []
    while True:
        next_line = peek_line(fh)

        if not _is_metadata_row(next_line):
            break

        line = fh.readline().strip()
        while line.count('"') % 2 == 1:
            line += "\n" + fh.readline()

        key, value_raw = line.rstrip().split("\t")

        value = value_raw.strip('"')

        if key.startswith("namespace"):
            continue
        property = _parse_aed_property(key)
        file_metadata.append(
            {"name": property.name, "value": format_aed_entry(value, property.type)}
        )

    return col_def, file_metadata


def parse_tsv_file(file: Path) -> Iterator[dict[str, Any]]:
    """
    Parse a TSV to annotations records.

    It is assumed that the first line is the header with fields  (lower or upper)

    Mandatory: chromosome, start, stop, name
    Optional: color, comments
    """
    with open(file) as inpt:
        reader = csv.DictReader(inpt, delimiter="\t")

        if reader.fieldnames is None:
            raise ValueError("Something went wrong during reading, no header found")

        reader.fieldnames = [name.lower() for name in reader.fieldnames]
        for row in reader:
            if "color" in row:
                color = _parse_color(row["color"])
            else:
                color = Color(DEFAULT_COLOUR)

            comment_val: Optional[str] = row.get("comments")
            comments: list[Comment] = []
            if comment_val is not None:

                for part_text in comment_val.split(";"):
                    part_text = part_text.strip()
                    comment = Comment(comment=part_text, username="NA")
                    comments.append(comment)

            start = row.get("start")
            end = row.get("stop") or row.get("end")
            chromosome = row.get("chromosome")

            if chromosome is None:
                raise ValueError("Field chromosome must be present")

            if start is None:
                raise ValueError("Field start must be present")

            if end is None:
                raise ValueError("Field stop or end must be present")

            yield {
                "name": row.get("name", ""),
                "chrom": (
                    chromosome.upper()
                    if not chromosome.startswith("chr")
                    else chromosome
                ),
                "start": int(start) + 1,
                "end": int(end),
                "color": color,
                "comments": comments,
            }


def _parse_color(color_cell: str):
    matches: list[str] = re.findall(r"\d+", color_cell)
    # check if color is rgba
    if len(matches) == 3:
        vals = ",".join(matches)
        color = Color(f"rgb({vals})")
    elif len(matches) == 4:
        # verify that opacity variable is within 0-1 else convert it
        opacity_value = str(int(matches[-1]) / 100)
        vals = ",".join([*matches[:-1], str(opacity_value)])
        color = Color(f"rgba({vals})")
    else:
        raise ValueError(f"Invalid RGB designation, {color_cell}")
    return color


def parse_aed_file(
    file: Path, continue_on_error: bool
) -> tuple[AedFileMetadata, AedRecords]:
    """Read aed file.

    Reference: https://assets.thermofisher.com/TFS-Assets/GSD/Handbooks/Chromosome_analysis_suite_v4.2_user-guide.pdf
    """
    with open(file, encoding="utf-8-sig") as aed_fh:

        column_definitions, file_metadata = _parse_aed_header(aed_fh)

        # This can deal with quote surrounded comments containing line breaks
        reader = csv.reader(
            aed_fh,
            delimiter="\t",
            quotechar='"',
            quoting=csv.QUOTE_MINIMAL,
            escapechar="\\",
        )

        records: list[dict[str, AedDatatypes | None]] = []

        for entry in reader:

            fmt_values: dict[str, AedDatatypes | None] = {}

            for col_idx, raw_value in enumerate(entry):
                col_def = column_definitions[col_idx]
                if raw_value == "":
                    fmt_values[col_def.name] = None
                else:
                    try:
                        result = format_aed_entry(raw_value, col_def.type)
                    except ValueError:
                        LOG.warning(
                            "Failed to format AED entry %s as format %s",
                            raw_value,
                            col_def.type,
                        )
                        if not continue_on_error:
                            raise
                        continue
                    fmt_values[col_def.name] = result
            records.append(fmt_values)

    return file_metadata, records


def format_bed_data(data_type: str, value: str) -> str | int | Color | None:
    """Parse the data based on its type."""
    new_value = None if value == "." else value
    if data_type == "color":
        return Color(DEFAULT_COLOUR) if new_value is None else Color(new_value)
    if data_type == "chrom":
        if not new_value:
            raise ValueError(f"field {data_type} must exist")
        return new_value.strip("chr")
    if data_type in {"start", "end"}:
        if not new_value:
            raise ValueError(f"field {data_type} must exist")
        # Bed files are zero-indexed
        if data_type == "start":
            return int(new_value) + 1
        else:
            return int(new_value)
    if data_type == "score":
        return int(new_value) if new_value else None
    if data_type == "strand":
        return "." if new_value in {"", None} else new_value
    return new_value


# FIXME: Reduce complexity to satisfy flake8 warnings
def fmt_aed_to_annotation(
    record: AedRecord,
    track_id: PydanticObjectId,
    genome_build: GenomeBuild,
    exclude_na: bool = True,
) -> AnnotationRecord | None:
    """Format a AED record to the Gens annotation format.

    This parser is a complement to the more general AED parser."""

    # try extract references from notes
    refs: list[ReferenceUrl | ScientificArticle] = []
    comments: list[Comment] = []
    if "note" in record and isinstance(record["note"], str):
        for note in record["note"].split(";"):
            if "PMID" in note:
                match = re.search(AED_PMID_REFERENCE_NOTE, note)
                if match:
                    try:
                        refs.append(
                            ScientificArticle.model_validate(
                                {"title": match.group(1), "pmid": match.group(2)}
                            )
                        )
                    except ValidationError:
                        continue
            elif "http" in note or "www" in note:
                match = re.search(AED_URL_REFERENCE_NOTE, note)
                if match:
                    try:
                        refs.append(
                            ReferenceUrl.model_validate(
                                {"title": match.group(1), "url": match.group(2)}
                            )
                        )
                    except ValidationError:
                        continue
            else:
                continue
        comments.append(Comment(comment=record["note"], username="parser"))

    EXCLUDE_FIELDS: list[str] = [
        "name",
        "start",
        "end",
        "sequence",
        "color",
        "note",
        "value",
    ]
    # cast to database metadata format
    metadata: list[
        DatetimeMetadata | GenericMetadata | UrlMetadata | DnaStrandMetadata
    ] = []
    for field_name, value in record.items():
        if any([field_name in EXCLUDE_FIELDS, value is None and exclude_na]):
            continue
        if isinstance(value, datetime):
            metadata.append(
                DatetimeMetadata(field_name=field_name, value=value, type="datetime")
            )
        elif isinstance(value, str):
            metadata.append(
                GenericMetadata(field_name=field_name, value=value, type="string")
            )
        elif isinstance(value, int):
            metadata.append(
                GenericMetadata(field_name=field_name, value=value, type="integer")
            )
        elif isinstance(value, float):
            metadata.append(
                GenericMetadata(field_name=field_name, value=value, type="float")
            )
        elif isinstance(value, bool):
            metadata.append(
                GenericMetadata(field_name=field_name, value=value, type="bool")
            )
        elif isinstance(value, AnyHttpUrl):
            metadata.append(
                UrlMetadata(
                    field_name=field_name,
                    value=ReferenceUrl(title=field_name, url=value),
                    type="url",
                )
            )
        else:

            metadata.append(
                GenericMetadata(field_name=field_name, value=str(value), type="string")
            )

    # Various checks to make sure the received data is in expected format
    # This data is manually entered, meaning that various types of errors might and will be found here
    try:
        rec_start = record["start"]
    except KeyError:
        raise ValueError(f"start not present in record: {record}")
    rec_end = record["end"]
    rec_color = record["color"]
    rec_sequence = record["sequence"]

    if rec_start is None or not isinstance(rec_start, int) or rec_start <= 0:
        if rec_start == 0:
            LOG.error("Found start 0, assigning 1")
            rec_start = 1
        else:
            raise ValueError(
                f"start expected to be present and greater than 0, found: {rec_start} for record {record}"
            )

    if rec_end is None or not isinstance(rec_end, int):
        raise ValueError(
            f"end expected in int format, found: {rec_end} for record {record}"
        )

    if not rec_color or not isinstance(rec_color, Color):
        LOG.error(f"Unknown color: {rec_color}, assigning black")
        rec_color = Color("#000000")

    if rec_sequence is None or not isinstance(rec_sequence, str):
        raise ValueError(f"sequence expected in str format, found: {rec_sequence}")

    try:
        chromosome = Chromosome(rec_sequence.strip("chr"))
    except ValueError:
        LOG.error(f"Failed to parse chromosome: {rec_sequence}, skipping")
        return None

    # build metadata
    return AnnotationRecord(
        track_id=track_id,
        name=str(record["name"]),
        genome_build=genome_build,
        chrom=chromosome,
        start=rec_start,
        end=rec_end,
        color=rec_color,
        references=refs,
        comments=comments,
        metadata=metadata,
    )
