from abc import ABC, abstractmethod

from gens.models.annotation import SimplifiedVariantRecord, VariantRecord
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
    def get_panels(self) -> list[tuple[str, str]]:
        """Return list of panel IDs and names"""
    
    @abstractmethod
    def get_panel(self, panel_id: str) -> list[SimplifiedVariantRecord]:
        """Return list of panel entries for specific panel"""

    @abstractmethod
    def get_case_url(self, case_id: str) -> str:
        """Return an URL to a specific case"""

    @abstractmethod
    def get_variant_url(self, variant_id: str) -> str:
        """Return an URL to a specific variant"""

