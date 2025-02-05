"""Models related to genomic data"""

from enum import Enum, IntEnum
from pydantic.types import PositiveInt
from .base import RWModel


class DnaStrand(Enum):  # TODO migrate to +/-
    """Valid DNA strand names.

    Names compliant with BED specification v1.0
    ref: https://samtools.github.io/hts-specs/BEDv1.pdf
    """

    FOR = '+'
    REV = '-'
    UNKNOWN = '.'

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
    start: PositiveInt
    end: PositiveInt


class ChromBand(RWModel):
    id: str
    stain: str
    start: int
    end: int
    strand: DnaStrand


class ChromInfo(RWModel):
    """Information on a chromosome."""

    chrom: Chromosome
    genome_build: GenomeBuild
    size: PositiveInt
    scale: float
    centromere: GenomePosition | None
    bands: list[ChromBand] | None