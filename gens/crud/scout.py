"""Operations against Scouts database."""

import logging
from typing import Any

from pydantic import ValidationError
from pymongo.database import Database

from gens.models.annotation import SimplifiedVariantRecord, VariantRecord
from gens.models.genomic import GenomicRegion, VariantCategory

LOG = logging.getLogger(__name__)


# FIXME: What to do with these?
class VariantValidationError(Exception):
    pass


class VariantNotFoundError(Exception):
    pass


def get_variants(
    case_id: str,
    sample_name: str,
    region: GenomicRegion,
    variant_category: VariantCategory,
    db: Database[Any],
) -> list[SimplifiedVariantRecord]:
    """Search the scout database for variants associated with a case.

    case_id :: id for a case
    sample_name :: display name for a sample
    variant_category :: categories

    Kwargs are optional search parameters that are passed to db.find().
    """
    # build query
    valid_genotype_calls = [
        "0/1",
        "1/1",
    ]  # only include unphased calls, different from the reference genome
    query: dict[str, Any] = {
        "case_id": case_id,
        "category": variant_category,
        "$or": [
            {"samples.sample_id": sample_name},
            {"samples.display_name": sample_name},
        ],
        "chromosome": region.chromosome,  # type: ignore
        "samples.genotype_call": {"$in": valid_genotype_calls},
    }
    # add start, end position to query
    if all(param is not None for param in [region.start, region.end]):
        # FIXME: Is the query_genomic_region important? Why is it used?
        query = {
            **query,
            # **query_genomic_region(region.start, region.end, variant_category),  # type: ignore
        }
    projection: dict[str, bool] = {}
    # query database
    LOG.info("Query variant database: %s", query)
    try:
        result: list[SimplifiedVariantRecord] = []
        for doc in db.get_collection("variant").find(query, projection):
            genotype = None

            for sample in doc.get("samples", []):
                if (
                    sample.get("sample_id") == sample_name
                    or sample.get("display_name") == sample_name
                ):
                    genotype = sample.get("genotype_call")

            doc_with_genotype = {**doc, "genotype": genotype}

            result.append(SimplifiedVariantRecord.model_validate(doc_with_genotype))

    except ValidationError as e:
        LOG.error("Failed to validate variant data: %s", e)
        raise VariantValidationError("Invalid variant data in Scout database")
    return result


def get_variant(document_id: str, db: Database[Any]) -> VariantRecord:
    """Get detailed variant info for one variant from the scout database."""
    raw_variant = db.get_collection("variant").find_one(
        {"_id": document_id}, {"_id": False}
    )
    if raw_variant is None:
        LOG.warning(
            "Variant with document_id %s not found in scout database", document_id
        )
        raise VariantNotFoundError(
            f"Variant with id {document_id} is not found in Scout database"
        )
    try:
        variant = VariantRecord.model_validate(raw_variant)
    except ValidationError as e:
        LOG.error("Failed to validate variant %s: %s", document_id, e)
        raise VariantValidationError(f"Invalid variant data for ID {document_id}")
    return variant
