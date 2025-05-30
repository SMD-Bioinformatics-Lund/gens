"""Models related to genome annotations."""

from datetime import datetime
from typing import Any, Literal

from pydantic import AnyUrl, ConfigDict, Field, PositiveInt, field_serializer
from pydantic_extra_types.color import Color

from .base import CreatedAtModel, ModifiedAtModel, PydanticObjectId, RWModel
from .genomic import Chromosome, DnaStrand, GenomeBuild, GenomePosition, VariantCategory


class Comment(
    RWModel,
    CreatedAtModel,
):  # pylint: disable=too-few-public-methods
    """Contianer for comments."""

    username: str
    comment: str
    displayed: bool = True


class ScientificArticle(RWModel):
    """Reference to a given scientific article."""

    title: str
    pmid: str
    authors: list[str] = []


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
    comments: list[Comment] = []
    references: list[ReferenceUrl | ScientificArticle] = []
    metadata: list[
        GenericMetadata | UrlMetadata | DatetimeMetadata | DnaStrandMetadata
    ] = Field(default=[], description="Optional generic metadata.")

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
    metadata: list[dict[str, Any]] = []  # TODO add data type to dict?
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

    features: list[GenomePosition]
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
    # positional info
    chrom: Chromosome
    start: PositiveInt
    end: PositiveInt
    strand: DnaStrand
    genome_build: GenomeBuild
    # render info
    height_order: PositiveInt


class SimplifiedVariantRecord(RWModel):
    """Simplified variant info for rendering variant track."""
    
    variant_id: str
    position: PositiveInt = Field(..., description="Start position of the variant", alias="start")
    end: PositiveInt
    variant_type: str
    sub_category: str | None = None

class VariantRecord(RWModel):
    """Detailed variant info for rendering variant tooltips.
    
    Reference: https://github.com/Clinical-Genomics/scout/blob/main/scout/models/variant/variant.py
    """
    document_id: str  # required. Same as _id
    variant_id: str  # required. A md5 string created by [ chrom, pos, ref, alt, variant_type]
    display_name: str  # required. no md5. chrom_pos_ref_alt_variant_type
    simple_id: str  # required. A string created by chrom_pos_ref_alt
    # The variant can be either research or clinical.
    # For research variants we display all the available information while
    # the clinical variants have limited annotation fields.
    variant_type: str  # required, choices=('research', 'clinical'))
    category: VariantCategory  # choices=('sv', 'snv', 'str')
    sub_category: str  # choices=('snv', 'indel', 'del', 'ins', 'dup', 'inv', 'cnv', 'bnd', 'str', 'mei')
    mate_id: str | None = None # For SVs this identifies the other end
    case_id: str  # case_id is a string like owner_caseid
    chromosome: str  # required
    position: PositiveInt = Field(..., description="Start position of the variant", alias="start")  
    end: int  # required
    length: int  # required
    reference: str  # required
    alternative: str  # required
    rank_score: float  # required
    variant_rank: int  # required
    rank_score_results: list[dict[str, str | int]]  # List if dictionaries
    institute: str  # institute_id, required
    sanger_ordered: bool = False
    validation: str | None = None  # Sanger validation, choices=('True positive', 'False positive')
    quality: float
    filters: list[str]
    samples: list[dict[str, Any]] = [] # list of dictionaries that are <gt_calls>
    genetic_models: list[str] = []  # list of strings choices=GENETIC_MODELS
    compounds: list[dict[str, Any]] = [] # sorted list of <compound> ordering='combined_score'
    genes: list[dict[str, Any]] = [] # list with <gene>
    dbsnp_id: str | None = None  # dbsnp id, if available
    # Gene ids:
    hgnc_ids: list[int] = [] # list of hgnc ids (int)
    hgnc_symbols: list[str] = [] # list of hgnc symbols (str)
    panels: list[str] = [] # list of panel names that the variant overlaps
    # Database options:
    gene_lists: list[Any] = []
    manual_rank: int | None = None  # choices=[0, 1, 2, 3, 4, 5]
    dismiss_variant: list[Any] = []
    acmg_classification: str | None = None # choices=ACMG_TERMS
    ccv_classification: str | None = None # choices=CCV_TERMS

    model_config = ConfigDict(
        extra='allow',
    )