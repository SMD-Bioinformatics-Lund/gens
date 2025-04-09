"""Read and write chrom sizes."""

from typing import Any
from pymongo.database import Database

from gens.models.genomic import ChromInfo, Chromosome, GenomeBuild

CHROMSIZES = "chrom-sizes"


def get_chromosome_size(
    db: Database[Any], chromosome: Chromosome, genome_build: GenomeBuild
) -> ChromInfo:
    """
    Gets the size in base pairs of a chromosome
    """
    chrom_data = db[CHROMSIZES].find_one(
        {
            "chrom": str(chromosome),
            "genome_build": int(genome_build),
        }
    )
    if chrom_data is None:
        raise ValueError(
            f"Could not find data for chromosome {chromosome} in DB; genome_build: {genome_build}"
        )
    return ChromInfo.model_validate(chrom_data)
