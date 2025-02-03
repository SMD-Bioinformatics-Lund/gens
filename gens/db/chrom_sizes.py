"""Read and write chrom sizes."""

from typing import List
from enum import Enum
from pymongo import MongoClient

from gens.models import RWModel


CHROMSIZES = "chrom-sizes"

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

    chrom: Chromosome
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
