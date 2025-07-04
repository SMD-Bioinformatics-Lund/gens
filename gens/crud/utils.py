"""Shared functions for building queries."""

from typing import Any


def query_genomic_region(
    start_pos: int, end_pos: int, motif_type: str = "other"
) -> dict[str, Any]:
    """Make a query for a chromosomal region."""
    if motif_type == "sv":  # for sv are start called position
        start_name = "position"
    else:
        start_name = "start"
    pos = {"$gte": start_pos, "$lte": end_pos}
    query: dict[str, Any] = {
        "$or": [
            {start_name: pos},
            {"end": pos},
            {"$and": [{start_name: {"$lte": start_pos}}, {"end": {"$gte": end_pos}}]},
        ],
    }
    return query
