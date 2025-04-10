"""Operations against Scouts database."""

import logging
from typing import Any
from pymongo.database import Database

from gens.models.base import User
from gens.models.genomic import VariantCategory

LOG = logging.getLogger(__name__)


def get_variants(
    scout_db: Database[Any],
    case_id: str,
    sample_name: str,
    variant_category: VariantCategory,
    **kwargs: str,
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
    if "chromosome" in kwargs:
        query["chromosome"] = kwargs["chromosome"].value  # type: ignore
    # add start, end position to query
    if all(param in kwargs for param in ["start_pos", "end_pos"]):
        query = {
            **query,
            **query_genomic_region(kwargs["start_pos"], kwargs["end_pos"], variant_category),  # type: ignore
        }
    # query database
    LOG.info("Query variant database: %s", query)
    return scout_db.variant.find(query)
