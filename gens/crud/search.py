"""Functions realted to searching for annotations and suggesting results."""

import re
from typing import Any
from pymongo.database import Database
from gens.models.genomic import GenomeBuild, GenomicRegion
from gens.db.collections import TRANSCRIPTS_COLLECTION, ANNOTATIONS_COLLECTION


def search_annotations(query: str, genome_build: GenomeBuild, db: Database[Any]) -> GenomicRegion | None:
    """Simple search for annotations and transcripts."""
    db_query: dict[str, Any] = {
        "gene_name": re.compile(r"^" + re.escape(query) + r"$", re.IGNORECASE),
        "genome_build": genome_build,
    }

    for col in [TRANSCRIPTS_COLLECTION, ANNOTATIONS_COLLECTION]:
        elements = list(db.get_collection(col).find(db_query, sort=[("start", 1), ("chrom", 1)]))
        if len(elements) > 0:
                start_elem = elements[0]
                end_elem = max(elements[0:], key=lambda elem: elem.get("end"))
                return GenomicRegion.model_validate({
                    "chromosome": start_elem.get("chrom"),
                    "start": start_elem.get("start"),
                    "end": end_elem.get("end"),
                })
    return None