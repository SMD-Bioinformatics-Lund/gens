import csv
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import ValidationError

from gens.models.sample import MetaEntry, MetaValue
from pydantic_extra_types.color import Color

import logging

LOG = logging.getLogger(__name__)


def value_exists(value: str | None) -> bool:
    return value is not None and value != "" and value != "."


def parse_meta_file(file: Path) -> MetaEntry:
    """Parse a metadata tsv file"""

    LOG.debug("Hi")

    data: list[MetaValue] = []
    with open(file, encoding="utf-8") as meta_fh:
        reader = csv.DictReader(meta_fh, delimiter="\t")
        fieldnames = reader.fieldnames or []
        row_name_header = next(
            (name for name in fieldnames if name not in {"type", "value", "color"}), None
        )

        LOG.debug(f"Hi: {row_name_header}")
        LOG.debug(f"Hi: {fieldnames}")

        for row in reader:
            entry: dict[str, Any] = {
                "type": row.get("type", ""),
                "value": row.get("value", ""),
            }
            row_name = row.get(row_name_header) if row_name_header else None

            if row_name and row_name != "." and row_name != "":
                entry["row_name"] = row_name

            LOG.debug(f"Entry: {entry}")

            color = row.get("color")
            if color and color != ".":
                try:
                    Color(color)
                except ValueError as err:
                    line_no = reader.line_num
                    LOG.error("Invalid color '%s' on line %s in %s", color, line_no, file)
                    raise ValueError(f"Invalid color '{color}' on line {line_no}") from err
                entry["color"] = color
            
            try:
                validated_meta = MetaValue.model_validate(entry)
            except ValidationError as err:
                line_no = reader.line_num
                LOG.error("Invalid metadata entry on line %s in %s: %s", line_no, file, err)
                raise ValueError(f"Failed to parse metadata on file {line_no}: {err}")
            data.append(validated_meta)

    LOG.debug(f"Returning file {file}")


    return MetaEntry(
        id=uuid4().hex, file_name=file.name, row_name_header=row_name_header, data=data
    )
