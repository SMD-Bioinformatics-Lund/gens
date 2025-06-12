import csv
from pathlib import Path
from uuid import uuid4

from gens.models.sample import MetaEntry, MetaValue

def value_exists(value: str | None) -> bool:
    return value is not None and value != "" and value != "."


def parse_meta_file(file: Path) -> MetaEntry:
    """Parse a metadata tsv file"""
    data: list[MetaValue] = []
    with open(file, encoding="utf-8") as meta_fh:
        reader = csv.DictReader(meta_fh, delimiter="\t")
        for row in reader:
            entry: dict[str, str] = {
                "type": row.get("type", ""),
                "value": row.get("value", ""),
            }
            row_name = row.get("row_name") or row.get("chrom")

            if row_name and row_name != "." and row_name != "":
                entry["row_name"] = row_name

            color = row.get("color")
            if color and color != ".":
                entry["color"] = color
            data.append(MetaValue.model_validate(entry))
    return MetaEntry(id=uuid4().hex, file_name=file.name, data=data)
