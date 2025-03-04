"""Read and write chrom sizes."""

from pymongo.database import Database

from gens.models.genomic import ChromInfo, Chromosome

CHROMSIZES = "chrom-sizes"


def get_chromosome_size(
    db: Database, chrom: Chromosome, genome_build: int = 38
) -> ChromInfo:
    """
    Gets the size in base pairs of a chromosome
    """
    chrom_data = db[CHROMSIZES].find_one(
        {
            "chrom": chrom.value,
            "genome_build": int(genome_build),
        }
    )
    if chrom_data is None:
        raise ValueError(
            f"Could not find data for chromosome {chrom} in DB; genome_build: {genome_build}"
        )
    return ChromInfo(**chrom_data)
