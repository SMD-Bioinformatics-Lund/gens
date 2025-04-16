"""Annotations."""

import csv
from io import TextIOWrapper
import logging
import re
from pathlib import Path
from typing import Any, Iterator
from datetime import datetime
from pydantic_extra_types.color import Color

from gens.models.annotation import AnnotationRecord, Comment, DatetimeMetadata, GenericMetadata, ReferenceUrl, ScientificArticle, UrlMetadata
from gens.models.base import PydanticObjectId
from gens.models.genomic import Chromosome
from pydantic import BaseModel, AnyHttpUrl, ValidationError

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
                colnames = field_names[: len(line)]
                continue

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


def fmt_bed_to_annotation(entry: dict[str, str], track_id: PydanticObjectId) -> AnnotationRecord:
    """Parse a bed or aed entry"""
    annotation: dict[str, Any] = {}
    # parse entry and format the values
    if len(entry) < len(BED_CORE_FIELDS):
        fields_in_row =  '\t'.join(entry.values())
        raise ValueError(f"Malformad entry in BED file!, row: {fields_in_row}")
    for colname, value in entry.items():
        # translate name, default to existing name if not in tr table
        new_colname = FIELD_TRANSLATIONS.get(colname, colname)

        # cast values into expected type
        try:
            annotation[new_colname] = format_bed_data(new_colname, value)
        except ValueError as err:
            LOG.debug("Bad line: %s", entry)
            import pdb; pdb.set_trace()
            raise ParserError(str(err)) from err

    try:
        return AnnotationRecord(
            track_id=track_id,
            name="The Nameless One" if annotation["name"] is None else annotation["name"],
            chrom=annotation["chrom"],
            start=annotation["start"],
            end=annotation["end"],
            color=annotation["color"]
        )
    except:
        import pdb; pdb.set_trace()


def _is_metadata_row(line: str) -> bool:
    """Check if a ChaS header row contains metadata definition.
    
    The first three columns in a ChaS metadata row are empty. 
    """
    row = line.rstrip().split('\t')
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
    match = re.search(r"(\w+):(\w+)\((.+)\)", property_def)
    if match is None:
        raise ValueError(f"Unknown AED property, {property_def}")
    prefix, name, type = match.groups()
    return AedPropertyDefinition(prefix=prefix, name=name, type=type)


AedDatatypes = str | int | bool | datetime | Color | AnyHttpUrl
AedFileMetadata = list[dict[str, AedDatatypes]]
AedRecord = dict[str, AedDatatypes | None]
AedRecords = list[AedRecord]


def format_aed_entry(value: str, format: str) -> AedDatatypes:
    """Format a aed entry using the defintion from the header."""
    match format:
        case "aed:String":
            return value
        case "aed:Integer":
            return int(value)
        case "aed:Boolean":
            return bool(value)
        case "aed:URI":
            return AnyHttpUrl(value)
        case "aed:DateTime":
            return datetime.fromisoformat(value)
        case "aed:Color": 
            return Color(value)
        case _:
            raise ValueError(f"Unknown format, {format}")


def _parse_aed_header(fh: TextIOWrapper) -> tuple[dict[int, AedPropertyDefinition], AedFileMetadata]:
    """Parse aed header and metadata rows to get column definitions.
    
    Retrun definition of the columns and metadata on the track encoded in the header.
    """
    # get column definition
    raw_header = fh.readline().rstrip().split('\t')
    col_def: dict[int, AedPropertyDefinition] = {
        col_no: _parse_aed_property(col) for col_no, col in enumerate(raw_header)
    }
    # parase optional metadata
    file_metadata: list[dict[str, AedDatatypes]] = []
    while True:
        next_line = peek_line(fh)
        if _is_metadata_row(next_line):
            # read and parse the metadata row
            key, value = fh.readline().strip().split('\t')
            # Not implemented yet
            if key.startswith('namespace'):
                continue
            property = _parse_aed_property(key)
            file_metadata.append({"name": property.name, "value": format_aed_entry(value, property.type)})
        else:
            break
    return col_def, file_metadata


def parse_tsv_file(file: Path) -> Iterator[dict[str, Any]]:
    """Parse a TSV to annotations records.
    
    It is assumed that the first line is the header.
    """
    with open(file) as inpt:
        reader = csv.DictReader(inpt, delimiter="\t")
        for row in reader:
            # format color
            if "Color" in row:
                matches = re.findall(r"\d+", row['Color'])
                # check if color is rgba
                if len(matches) == 3:
                    color = Color(matches)
                elif len(matches) == 4:
                    # verify that opacity variable is within 0-1 else convert it
                    matches[-1] = int(matches[-1]) / 100 if 1 <= float(matches[-1]) < 100 else matches[-1]
                    color = Color(matches)
                else:
                    raise ValueError(f"Invalid RGB designation, {row['Color']}")
            else:
                color = Color(DEFAULT_COLOUR)
            yield {"name": row.get("Name", "The Nameless One"), "chrom": row["Chromosome"], "start": row["Start"], "end": row["Stop"], "color" :color}
            

def parse_aed_file(file: Path) -> tuple[AedFileMetadata, AedRecords]:
    """Read aed file.
    
    Reference: https://assets.thermofisher.com/TFS-Assets/GSD/Handbooks/Chromosome_analysis_suite_v4.2_user-guide.pdf"""
    with open(file, encoding="utf-8-sig") as aed_fh:
        #aed_reader = csv.reader(aed, delimiter="\t")
        column_definitions, file_metadata = _parse_aed_header(aed_fh)

        # iterate over file content
        records: list[dict[str, AedDatatypes | None]] = []
        for line in aed_fh:
            raw_cell_values = [cell.strip() for cell in line.split('\t')]
            if len(raw_cell_values) > len(column_definitions):
                raise ValueError('The header contains fewer columns than the table')

            # format cell values and store temporarily in dict
            fmt_values: dict[str, AedDatatypes | None] = {}
            for col_idx, raw_value in enumerate(raw_cell_values):
                col_def = column_definitions[col_idx]
                if raw_value == '':
                    fmt_values[col_def.name] = None
                else:
                    fmt_values[col_def.name] = format_aed_entry(raw_value, col_def.type)

            records.append(fmt_values)
    return file_metadata, records


def format_bed_data(
    data_type: str, value: str
) -> str | int | Color | None:
    """Parse the data based on its type."""
    new_value = None if value == "." else value
    if data_type == "color":
        return Color(DEFAULT_COLOUR) if new_value is None else Color(new_value.split(','))
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


def fmt_aed_to_annotation(record: AedRecord, track_id: PydanticObjectId, exclude_na: bool = True) -> AnnotationRecord:
    """Format a AED record to the Gens anntoation format.
    
    This parser is a complement to the more general AED parser."""
    # try extract references from notes
    refs: list[ReferenceUrl | ScientificArticle] = []
    comments: list[Comment] = []
    if 'note' in record:
        for note in record['note'].split(';'):
            if not isinstance(note, str):
                continue
            if "PMID" in note:
                match = re.search(AED_PMID_REFERENCE_NOTE, note)
                if match:
                    try:
                        refs.append(ScientificArticle.model_validate({
                            "title": match.group(1), "pmid": match.group(2)}))
                    except ValidationError as err:
                        LOG.warning("Note could not be formatted as refeerence, '%s'; error: %s", note, err)
            elif "http" in note or "www" in note:
                match = re.search(AED_URL_REFERENCE_NOTE, note)
                if match:
                    try:
                        refs.append(ReferenceUrl.model_validate({"title": match.group(1), "url": match.group(2)}))
                    except ValidationError as err:
                        LOG.warning("Note could not be formatted as refeerence, '%s'; error: %s", note, err)
            else:
                continue
        comments.append(Comment(comment=record['note'], username="parser"))

    EXCLUDE_FIELDS: list[str] = ['name', 'start', 'end', 'sequence', 'color', 'note', 'value']
    # cast to database metadata format
    metadata: list[DatetimeMetadata | GenericMetadata | UrlMetadata] = []
    for field_name, value in record.items():
        if any([field_name in EXCLUDE_FIELDS, value is None and exclude_na]):
            continue
        if isinstance(value, datetime):
            metadata.append(DatetimeMetadata(field_name=field_name, value=value, type="datetime"))
        elif isinstance(value, str):
            metadata.append(GenericMetadata(field_name=field_name, value=value, type="string"))
        elif isinstance(value, int):
            metadata.append(GenericMetadata(field_name=field_name, value=value, type="integer"))
        elif isinstance(value, float):
            metadata.append(GenericMetadata(field_name=field_name, value=value, type="float"))
        elif isinstance(value, bool):
            metadata.append(GenericMetadata(field_name=field_name, value=value, type="bool"))
        elif isinstance(value, AnyHttpUrl):
            metadata.append(UrlMetadata(field_name=field_name, value=ReferenceUrl(title=field_name, url=value), type="url"))
        else:
            metadata.append(GenericMetadata(field_name=field_name, value=value, type="string"))

    # build metadata
    return AnnotationRecord(
        track_id=track_id,
        name=record['name'],
        chrom=Chromosome(record['sequence'].strip("chr")),
        start=record['start'], 
        end=record['end'], 
        color=record['color'],
        references=refs,
        comments=comments,
        metadata=metadata
    )
