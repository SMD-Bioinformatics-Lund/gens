import logging
from collections import defaultdict
from typing import Any

from pydantic import ValidationError
from pymongo.database import Database

from gens.adapters.base import InterpretationAdapter
from gens.crud.scout import VariantNotFoundError, VariantValidationError
from gens.models.annotation import (
    GeneListRecord,
    SimplifiedVariantRecord,
    VariantRecord,
)
from gens.models.genomic import GenomicRegion, VariantCategory

LOG = logging.getLogger(__name__)


class ScoutMongoAdapter(InterpretationAdapter):

    def __init__(self, db: Database[Any]):
        self._db = db

    # FIXME: Cleanup
    def get_variants(
        self,
        case_id: str,
        sample_name: str,
        region: GenomicRegion,
        variant_category: VariantCategory,
    ) -> list[SimplifiedVariantRecord]:
        valid_genotype_calls = ["0/1", "1/1"]
        query: dict[str, Any] = {
            "case_id": case_id,
            "category": variant_category,
            "$or": [
                {"samples.sample_id": sample_name},
                {"samples.display_name": sample_name},
            ],
            "chromosome": region.chromosome,
            "samples.genotype_call": {"$in": valid_genotype_calls},
        }
        if all(param is not None for param in [region.start, region.end]):
            query = {
                **query,
                **query_genomic_regions(region.start, region.end, variant_category),  # type: ignore
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

    # FIXME: Consider cleanup
    def get_variant(self, document_id: str) -> VariantRecord:
        raw_variant = self._db.get_collection("variant").find_one(
            {"_id": document_id}, {"_id", False}
        )
        if raw_variant is None:
            LOG.warning(
                "Variant with document_id %s not found in Scout database", document_id
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

    def get_gene_lists(self) -> list[GeneListRecord]:

        raw_query_results = list(
            self._db.get_collection("gene_panel").find(
                {}, {"_id": 1, "panel_name": 1, "display_name": 1, "version": 1}
            )
        )

        all_gene_lists_parsed = [
            {
                "id": res["panel_name"],
                "name": res["display_name"],
                "version": res["version"],
            }
            for res in raw_query_results
        ]

        highest_version_per_panel: dict[str, float] = defaultdict(float)
        for res_dict in all_gene_lists_parsed:
            panel_id = res_dict["id"]
            version = res_dict["version"]
            if version > highest_version_per_panel[panel_id]:
                highest_version_per_panel[panel_id] = res_dict["version"]

        only_highest = [
            {
                "id": gene_list["id"],
                "name": gene_list["name"],
                "version": str(gene_list["version"]),
            }
            for gene_list in all_gene_lists_parsed
            if gene_list["version"] == highest_version_per_panel[gene_list["id"]]
        ]

        gene_lists = [GeneListRecord.model_validate(result) for result in only_highest]

        return gene_lists

    def get_panel(self, panel_id: str) -> list[str]:
        # FIXME: Look into how to grab the latest version here
        panel = self._db.get_collection("gene_panel").find_one({"panel_name": panel_id})
        if not panel:
            return []
        genes = []
        for gene in panel.get("genes", []):
            symbol = gene.get("hgnc_symbol") or gene.get("symbol")
            if symbol:
                genes.append(symbol)
        return genes
        # return super().get_panel(panel_id)

    # FIXME: Panels should be here. Should the URLs? Unsure. Something to ponder.
    def get_case_url(self, case_id: str) -> str:
        return ""
        # return super().get_case_url(case_id)

    def get_variant_url(self, variant_id: str) -> str:
        return ""
        # return super().get_variant_url(variant_id)
