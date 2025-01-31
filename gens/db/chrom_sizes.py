"""Read and write chrom sizes."""

from typing import List
from enum import Enum
from pymongo import MongoClient

from gens.models import RWModel


CHROMSIZES = "chrom-sizes"


class DnaStrand(Enum):  # TODO migrate to +/-
    """Valid DNA strand names."""

    FOR = 0
    REV = 1

class GenomeBuild(Enum):
    """Valid genome builds."""

    HG19 = 19
    HG38 = 38


class Chromosomes(Enum):
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


class GenomePosition(RWModel):
    start: int
    end: int


class ChromBand(RWModel):
    id: str
    stain: str
    start: int
    end: int
    strand: DnaStrand


class ChromInfo(RWModel):
    """Information on a chromosome."""

    chrom: Chromosomes
    genome_build: GenomeBuild
    size: int
    scale: float
    centromere: GenomePosition
    bands: List[ChromBand] = []


def get_chromosome_size(db: MongoClient, chrom: str, genome_build:int=38) -> ChromInfo:
    """
    Gets the size in base pairs of a chromosome
    """
    chrom_data = db[CHROMSIZES].find_one(
        {
            "chrom": str(chrom),
            "genome_build": int(genome_build),
        }
    )
    if chrom_data is None:
        raise ValueError(
            f"Could not find data for chromosome {chrom} in DB; genome_build: {genome_build}"
        )
    return ChromInfo(**chrom_data)
