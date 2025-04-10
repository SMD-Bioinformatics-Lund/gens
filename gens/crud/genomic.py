"""Genomic related operations."""

import logging
from typing import Any

from pymongo.database import Database
from gens.db.collections import CHROMSIZES_COLLECTION
from gens.models.genomic import ChromInfo, Chromosome, GenomeBuild


LOG = logging.getLogger(__name__)


def get_chromosome_info(
    db: Database[Any], chromosome: Chromosome, genome_build: GenomeBuild
) -> ChromInfo:
    """
    Gets the size in base pairs of a chromosome
    """
    chrom_data = db[CHROMSIZES_COLLECTION].find_one(
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

