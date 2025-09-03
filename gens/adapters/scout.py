import logging
from typing import Any

from mongomock import Database
from pydantic import ValidationError

from gens.adapters.base import VariantSoftwareAdapter
from gens.crud.scout import VariantNotFoundError, VariantValidationError
from gens.models.annotation import SimplifiedVariantRecord, VariantRecord
from gens.models.genomic import GenomicRegion, VariantCategory


LOG = logging.getLogger(__name__)


class ScoutAdapter(VariantSoftwareAdapter):

    def __init__(self, db: Database[Any]):
        self._db = db

    def get_variants(
            self,
            case_id: str,
            sample_name: str,
            region: GenomicRegion,
            variant_category: VariantCategory
    ) -> list[SimplifiedVariantRecord]:
        valid_genotype_calls = ["0/1", "1/1"]
        query: dict[str, Any] = {
            "case_id": case_id,
            "category": variant_category,
            "$or": [
                {"samples.sample_id": sample_name},
                {"samples.display_name": sample_name}
            ],
            "chromosome": region.chromosome,
            "samples.genotype_call": {"$in": valid_genotype_calls}
        }
        if all(param is not None for param in [region.start, region.end]):
            query = {
                **query,
                **query_genomic_regions(region.start, region.end, variant_category), # type: ignore
            }
        projection: dict[str, bool] = {}
        LOG.info("Query variant database: %s", query)

        try:
            result: list[SimplifiedVariantRecord] = []
            for doc in self._db.get_collection("variant").find(query, projection):
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
            # FIXME: More details?
            raise VariantValidationError("Invalid variant data in Scout database ")
        return result


    def get_variant(self, document_id: str) -> VariantRecord:
        raw_variant = self._db.get_collection("variant").find_one(
            {"_id": document_id}, {"_id", False}
        )
        if raw_variant is None:
            LOG.warning("Variant with document_id %s not found in Scout database", document_id)
            raise VariantNotFoundError(
                f"Variant with id {document_id} is not found in Scout database"
            )
        try:
            variant = VariantRecord.model_validate(raw_variant)
        except ValidationError as e:
            LOG.error("Failed to validate variant %s: %s", document_id, e)
            raise VariantValidationError(f"Invalid variant data for ID {document_id}")
        return variant
