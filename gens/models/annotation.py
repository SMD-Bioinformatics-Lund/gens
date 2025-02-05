"""Models related to genome annotations."""

from typing import Literal
from pydantic import PositiveInt, field_serializer
from pydantic_extra_types.color import Color

from ..models import RWModel
from ..models.genomic import GenomeBuild, Chromosome, DnaStrand


class AnnotationRecord(RWModel):
    """Annotation record."""

    name: str
    chrom: Chromosome
    genome_build: GenomeBuild
    score: int
    source: str
    start: PositiveInt
    end: PositiveInt
    strand: DnaStrand
    color: Color

    @field_serializer('color')
    def serialize_color(self, color: Color, _) -> tuple[int, int, int]:
        """Serialize RGB as tuple"""
        return color.as_rgb_tuple()


class ExonFeature(RWModel):
    """Exon information"""

    feature: Literal['exon']
    start: PositiveInt
    end: PositiveInt
    exon_number: PositiveInt


class UtrFeature(RWModel):
    """utr information"""

    feature: Literal['five_prime_utr', 'three_prime_utr']
    start: PositiveInt
    end: PositiveInt


class TranscriptRecord(RWModel):
    """Container for transcript information."""

    transcript_id: str
    transcript_biotype: str
    gene_name: str
    mane: str | None
    hgnc_id: str | None
    refseq_id: str | None
    features: list[ExonFeature | UtrFeature]
    # positional info
    chrom: Chromosome
    start: PositiveInt
    end: PositiveInt
    strand: DnaStrand
    genome_build: GenomeBuild
    # render info
    height_order: PositiveInt
