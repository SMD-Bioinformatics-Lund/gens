"""Models related to genome annotations."""

from datetime import datetime
from typing import Any, Literal

from pydantic import AnyUrl, Field, HttpUrl, PositiveInt, field_serializer
from pydantic_extra_types.color import Color

from .base import CreatedAtModel, ModifiedAtModel, PydanticObjectId, RWModel
from .genomic import Chromosome, DnaStrand, GenomeBuild, GenomePosition


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
