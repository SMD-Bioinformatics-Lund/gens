import csv
from pathlib import Path
from typing import Any
from uuid import uuid4

from gens.models.sample import MetaEntry, MetaValue
from pydantic_extra_types.color import Color


def value_exists(value: str | None) -> bool:
    return value is not None and value != "" and value != "."


def parse_meta_file(file: Path) -> MetaEntry:
    """Parse a metadata tsv file"""
    data: list[MetaValue] = []
    with open(file, encoding="utf-8") as meta_fh:
        reader = csv.DictReader(meta_fh, delimiter="\t")
        fieldnames = reader.fieldnames or []
        row_name_header = next(
            (name for name in fieldnames if name not in {"type", "value", "color"}), None
        )
        for row in reader:
            entry: dict[str, Any] = {
                "type": row.get("type", ""),
                "value": row.get("value", ""),
            }
            row_name = row.get(row_name_header) if row_name_header else None

            if row_name and row_name != "." and row_name != "":
                entry["row_name"] = row_name

            color = row.get("color")
            if color and color != ".":
                entry["color"] = color
            data.append(MetaValue.model_validate(entry))
    return MetaEntry(
        id=uuid4().hex, file_name=file.name, row_name_header=row_name_header, data=data
    )
