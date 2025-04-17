"""Operations against Scouts database."""

import logging
from typing import Any

from pymongo.database import Database

from gens.models.genomic import GenomicRegion, VariantCategory

LOG = logging.getLogger(__name__)


def get_variants(
    case_id: str,
    sample_name: str,
    region: GenomicRegion,
    variant_category: VariantCategory,
    db: Database[Any],
) -> Any:
    """Search the scout database for variants associated with a case.

    case_id :: id for a case
    sample_name :: display name for a sample
    variant_category :: categories

    Kwargs are optional search parameters that are passed to db.find().
    """
    # build query
    query: dict[str, Any] = {
        "case_id": case_id,
        "category": variant_category,
        "$or": [
            {"samples.sample_id": sample_name},
            {"samples.display_name": sample_name},
        ],
    }
    # add chromosome
    query["chromosome"] = region.chromosome  # type: ignore
    # add start, end position to query
    if all(param is not None for param in [region.start, region.end]):
        query = {
            **query,
            **query_genomic_region(region.start, region.end, variant_category),  # type: ignore
        }
    # query database
    LOG.info("Query variant database: %s", query)
    return db.get_collection("variant").find(query)
