"""Models related to genome annotations."""

from datetime import datetime
from typing import Any, Literal

from pydantic import AnyUrl, ConfigDict, Field, PositiveInt, field_serializer
from pydantic_extra_types.color import Color

from .base import CreatedAtModel, ModifiedAtModel, PydanticObjectId, RWModel
from .genomic import (
    Chromosome,
    DnaStrand,
    GenomeBuild,
    GenomePosition,
    VariantCategory,
    VariantSubCategory,
    VariantType,
)


class Comment(
    RWModel,
    CreatedAtModel,
):  # pylint: disable=too-few-public-methods
    """Container for comments."""

    username: str
    comment: str
    displayed: bool = True


class ScientificArticle(RWModel):
    """Reference to a given scientific article."""

    title: str
    pmid: str
    authors: list[str] = Field(default_factory=list)


class ReferenceUrl(RWModel):
    """Information on URL link or reference."""

    title: str
    url: AnyUrl

    @field_serializer("url")
    def serialise_url(self, url: AnyUrl, _info):
        return str(url)


class UrlMetadata(RWModel):
    """Key-value indexer for DNA strand info."""

    field_name: str
    value: ReferenceUrl
    type: Literal["url"]


class DnaStrandMetadata(RWModel):
    """Key-value indexer for DNA strand info."""

    field_name: str
    value: DnaStrand
    type: Literal["dna_strand"]


class DatetimeMetadata(RWModel):
    """Key-value indexer for datetime info."""

    field_name: str
    value: datetime
    type: Literal["datetime"]


class GenericMetadata(RWModel):
    """Key-value indexer for generic metadata."""

    field_name: str
    value: str | int | float
    type: str


class AnnotationRecord(GenomePosition, RWModel):
    """Annotation record.

    It contains the core fields the BED and AED formats.
    BED specification: https://samtools.github.io/hts-specs/BEDv1.pdf
    """

    track_id: PydanticObjectId = Field(..., description="Id of the annotation track")
    name: str
    description: str | None = None
    genome_build: GenomeBuild
    chrom: Chromosome
    color: Color = Color("#808080")  # defaults to grey
    comments: list[Comment] = Field(default_factory=list)
    references: list[ReferenceUrl | ScientificArticle] = Field(default_factory=list)
    metadata: list[
        GenericMetadata | UrlMetadata | DatetimeMetadata | DnaStrandMetadata
    ] = Field(default_factory=list, description="Optional generic metadata.")

    @field_serializer("color")
    def serialize_color(
        self, color: Color, _: Any
    ) -> tuple[int, int, int] | tuple[int, int, int, float]:
        """Serialize hex colors as an RGBA tuple"""
        return color.as_rgb_tuple()


class AnnotationTrack(RWModel, CreatedAtModel, ModifiedAtModel):
    """Annotation track."""

    name: str
    description: str
    maintainer: str | None = None
    metadata: list[dict[str, Any]] = Field(default_factory=list)
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


class SimplifiedTrackInfo(GenomePosition, RWModel):
    """Simplified annotation for rendering basic tracks."""

    record_id: PydanticObjectId
    name: str
    type: str  # snv / mane
    color: Color | None = None
    chrom: str | None = None


class SimplifiedTranscriptInfo(SimplifiedTrackInfo):
    """Simplified transcript annotation."""

    is_protein_coding: bool
    features: list[ExonFeature | UtrFeature]
    strand: DnaStrand


class TranscriptRecord(RWModel):
    """Container for transcript information."""

    transcript_id: str
    transcript_biotype: str
    gene_name: str
    mane: str | None
    hgnc_id: str | None
    refseq_id: str | None
    features: list[ExonFeature | UtrFeature]
    chrom: Chromosome
    start: PositiveInt
    end: PositiveInt
    strand: DnaStrand
    genome_build: GenomeBuild


class GeneListRecord(RWModel):
    id: str
    name: str
    version: str


class SimplifiedVariantRecord(RWModel):
    """Simplified variant info for rendering variant track."""

    document_id: str
    position: PositiveInt = Field(
        ..., description="Start position of the variant", alias="start"
    )
    end: PositiveInt
    variant_type: str
    sub_category: str | None = None
    rank_score: float | None = None
    genotype: str | None = None


class VariantRecord(RWModel):
    """Detailed variant info for rendering variant tooltips.

    Reference: https://github.com/Clinical-Genomics/scout/blob/main/scout/models/variant/variant.py
    """

    document_id: str = Field(..., description="Same as _id.")
    variant_id: str = Field(
        ..., description="A md5 string created by [ chrom, pos, ref, alt, variant_type]"
    )
    display_name: str = Field(..., description="no md5. chrom_pos_ref_alt_variant_type")
    simple_id: str = Field(..., description="A string created by chrom_pos_ref_alt")
    variant_type: VariantType = Field(
        ...,
        description="Scout uses variant type to determine what information to display.",
    )
    category: VariantCategory
    sub_category: VariantSubCategory
    mate_id: str | None = Field(
        default=None, description="For SVs this identifies the other end"
    )
    case_id: str
    chromosome: str
    position: PositiveInt = Field(
        ..., description="Start position of the variant", alias="start"
    )
    end: int
    length: int
    reference: str
    alternative: str
    rank_score: float = 0
    variant_rank: int = 0
    rank_score_results: list[dict[str, str | int]] = Field(default_factory=list)
    institute: str = Field(..., description="institute id")
    sanger_ordered: bool = False
    validation: str | None = Field(
        None,
        description="Sanger validation result, choices=('True positive', 'False positive')",
    )
    quality: float = 0
    filters: list[str] = Field(default_factory=list)
    samples: list[dict[str, Any]] = Field(default_factory=list, description="Contain <gt_calls> objects")
    genetic_models: list[str] = Field(default_factory=list, description="List of genetic models enum")
    compounds: list[dict[str, Any]] = Field(
        default_factory=list, description="sorted list of <compound> ordering=combined_score"
    )
    genes: list[dict[str, Any]] = Field(default_factory=list, description="List of gene objects.")
    dbsnp_id: str | None = None
    # Gene ids:
    hgnc_ids: list[int] = Field(default_factory=list)
    hgnc_symbols: list[str] = Field(default_factory=list)
    panels: list[str] = Field(
        default_factory=list, description="list of panel names that the variant overlaps"
    )
    # Database options:
    gene_lists: list[Any] = Field(default_factory=list)
    manual_rank: int | None = Field(None, description="choices=[0, 1, 2, 3, 4, 5]")
    dismiss_variant: list[Any] = Field(default_factory=list)
    acmg_classification: str | int | None = Field(
        None, description="Manual ACMG classification of variant"
    )
    ccv_classification: str | None = Field(
        None, description="Manual CCV classification of variant"
    )

    model_config = ConfigDict(
        extra="allow",
    )
