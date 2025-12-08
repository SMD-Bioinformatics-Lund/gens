"""Null adapter used when no interpretation software is configured."""

import logging

from gens.adapters.base import InterpretationAdapter
from gens.crud.scout import VariantNotFoundError
from gens.models.annotation import (
    GeneListRecord,
    SimplifiedVariantRecord,
    VariantRecord,
)
from gens.models.genomic import GenomicRegion, VariantCategory

LOG = logging.getLogger(__name__)


class NullInterpretationAdapter(InterpretationAdapter):
    """Fallback adapter that returns empty results when integration is disabled."""

    def __init__(self) -> None:
        LOG.info("Variant software integration not configured; using null adapter")

    def get_variants(
        self,
        case_id: str,
        sample_name: str,
        region: GenomicRegion,
        variant_category: VariantCategory,
    ) -> list[SimplifiedVariantRecord]:
        return []

    def get_variant(self, variant_id: str) -> VariantRecord:
        raise VariantNotFoundError(
            "Variant software integration not configured; no variants available"
        )

    def get_gene_lists(self) -> list[GeneListRecord]:
        return []

    def get_gene_list(self, gene_list_id: str) -> list[str]:
        return []
