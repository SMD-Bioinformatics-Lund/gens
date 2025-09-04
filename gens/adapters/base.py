from abc import ABC, abstractmethod

from gens.models.annotation import (
    GeneListRecord,
    SimplifiedVariantRecord,
    VariantRecord,
)
from gens.models.genomic import GenomicRegion, VariantCategory


class InterpretationAdapter(ABC):

    @abstractmethod
    def get_variants(
        self,
        case_id: str,
        sample_name: str,
        region: GenomicRegion,
        variant_category: VariantCategory,
    ) -> list[SimplifiedVariantRecord]:
        """Return variants for a sample"""

    @abstractmethod
    def get_variant(self, document_id: str) -> VariantRecord:
        """Return a single variant"""

    @abstractmethod
    def get_gene_lists(self) -> list[GeneListRecord]:
        """Return list of panel IDs and names"""

    @abstractmethod
    def get_panel(self, panel_id: str) -> list[str]:
        """Return list of gene symbols for specific panel"""

