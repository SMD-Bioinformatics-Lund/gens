"""Models related to genome annotations."""

from typing import Any, Literal

from pydantic import PositiveInt, field_serializer, Field
from pydantic_extra_types.color import Color

from .base import RWModel, CreatedAtModel, ModifiedAtModel, PydanticObjectId
from .genomic import Chromosome, DnaStrand, GenomeBuild, GenomePosition


class Comment(RWModel, CreatedAtModel,):  # pylint: disable=too-few-public-methods
    """Contianer for comments."""

    username: str
    comment: str
    displayed: bool = True


class AnnotationRecord(GenomePosition, RWModel):
    """Annotation record."""

    name: str
    description: str | None = None
    chrom: Chromosome
    source: str | None = None
    strand: DnaStrand = DnaStrand.UNKNOWN
    color: Color = Color("#808080")  # defaults to grey
    score: int | None = None
    comment: list[Comment] = []

    @field_serializer("color")
    def serialize_color(
        self, color: Color, _: Any
    ) -> tuple[int, int, int] | tuple[int, int, int, float]:
        """Serialize RGB as tuple"""
        return color.as_rgb_tuple()


class AnnotationTrack(RWModel, CreatedAtModel, ModifiedAtModel):
    """Annotation track."""
    
    name: str
    description: str
    maintainer: str | None = None
    genome_build: GenomeBuild


class AnnotationTrackInDb(AnnotationTrack):
    """Database representation of annotation track."""

    track_id: PydanticObjectId = Field(alias="_id")


class ExonFeature(RWModel):
    """Exon information"""

    feature: Literal["exon"]
    start: PositiveInt
    end: PositiveInt
    exon_number: PositiveInt


class UtrFeature(RWModel):
    """utr information"""

    feature: Literal["five_prime_utr", "three_prime_utr"]
    start: PositiveInt
    end: PositiveInt


class ReducedTrackInfo(GenomePosition, RWModel):
    """Simplified annotation for rendering basic tracks."""

    record_id: PydanticObjectId
    name: str
    type: str  # snv / mane


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
