"""Models related to genomic data"""

import re
from enum import Enum, IntEnum

from pydantic import computed_field, field_validator
from pydantic.types import PositiveFloat, PositiveInt

from .base import RWModel

REGION_PATTERN = re.compile(r"^(.+):(.+)-(.+)$")


class DnaStrand(Enum):  # TODO migrate to +/-
    """Valid DNA strand names.

    Names compliant with BED specification v1.0
    ref: https://samtools.github.io/hts-specs/BEDv1.pdf
    """

    FOR = "+"
    REV = "-"
    UNKNOWN = "."


class GenomeBuild(IntEnum):
    """Valid genome builds."""

    HG19 = 19
    HG38 = 38


class Chromosome(Enum):
    """Valid chromosome names."""

    CH1 = "1"
    CH2 = "2"
    CH3 = "3"
    CH4 = "4"
    CH5 = "5"
    CH6 = "6"
    CH7 = "7"
    CH8 = "8"
    CH9 = "9"
    CH10 = "10"
    CH11 = "11"
    CH12 = "12"
    CH13 = "13"
    CH14 = "14"
    CH15 = "15"
    CH16 = "16"
    CH17 = "17"
    CH18 = "18"
    CH19 = "19"
    CH20 = "20"
    CH21 = "21"
    CH22 = "22"
    CHX = "X"
    CHY = "Y"
    MT = "MT"


class VariantCategory(Enum):
    """Valid categories for variants."""

    STRUCTURAL = "str"
    SINGLE_VAR = "sv"
    SINGLE_NT_VAR = "snv"


class GenomePosition(RWModel):
    """Basic genome positioning info."""

    start: PositiveInt
    end: PositiveInt


class ChromBand(RWModel):
    """Store positional information of chromosome bands."""

    id: str
    stain: str
    start: PositiveInt
    end: PositiveInt
    strand: DnaStrand


class ChromInfo(RWModel):
    """Information on a chromosome."""

    chrom: Chromosome
    genome_build: GenomeBuild
    size: PositiveInt
    scale: float
    centromere: GenomePosition | None
    bands: list[ChromBand] | None


class GenomicRegion(RWModel):
    """Representation of a region string format.

    i.e. chromosome:start-end
    """

    region: str

    @field_validator("region")
    @classmethod
    def valid_region(cls, region: str):
        """Validate region string.

        Expected format <chom>:<start>-<end>
        chrom: member of Enum Chromosome
        start: >= 0
        end: [0-9]+|None
        """
        match = re.match(REGION_PATTERN, region)
        if not match:
            raise ValueError(f"Invalid format of region string: {region}")
        chrom, start, _ = match.groups()
        if chrom not in [chr.value for chr in Chromosome]:
            raise ValueError(f"{chrom} is not a valid chromosome name")
        if 0 > float(start):
            raise ValueError(f"{start} is not a valid start position")
        return region

    @computed_field() # type: ignore
    @property
    def chromosome(self) -> Chromosome:
        """Get the chromosome name from region string."""

        match = re.match(REGION_PATTERN, self.region)
        if match is None:
            raise ValueError("Invalid region designation.")
        return Chromosome(match.group(1))

    @computed_field() # type: ignore
    @property
    def start(self) -> int | None:
        """Get start position from a region string."""

        match = re.match(REGION_PATTERN, self.region)
        return int(match.group(2)) if match else None

    @computed_field() # type: ignore
    @property
    def end(self) -> int | None:
        """Get end position from a region string."""

        match = re.match(REGION_PATTERN, self.region)
        if match is None:
            return None

        raw_num: str = match.group(3)
        try:
            num = int(raw_num)
        except ValueError:
            num = None
        return num


class QueryGenomicPosition(GenomicRegion):
    """For querying a genomic position using a position string."""

    x_pos: PositiveFloat
    y_pos: PositiveFloat
    x_ampl: PositiveFloat


class QueryChromosomeCoverage(RWModel):
    """Request for getting coverage from multiple chromosome and regions."""

    sample_id: str
    case_id: str
    genome_build: GenomeBuild
    plot_height: PositiveFloat
    top_bottom_padding: PositiveFloat
    baf_y_start: float
    baf_y_end: float
    log2_y_start: float
    log2_y_end: float
    overview: bool
    reduce_data: PositiveFloat
    chromosome_pos: list[QueryGenomicPosition]

    @field_validator("reduce_data")
    @classmethod
    def validate_percentage(cls, value: float):
        """Validate that a number falls between 0-1."""

        if not 0 <= value <= 1:
            raise ValueError(f"{value} is not within 0-1")
