from abc import ABC, abstractmethod

from gens.models.annotation import SimplifiedVariantRecord, VariantRecord
from gens.models.genomic import GenomicRegion, VariantCategory


class VariantSoftwareAdapter(ABC):

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
