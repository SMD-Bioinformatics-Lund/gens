"""Genomic related operations."""

import logging
from typing import Any

from pymongo.database import Database

from gens.db.collections import CHROMSIZES_COLLECTION
from gens.models.genomic import ChromInfo, Chromosome, GenomeBuild, ReducedChromInfo

LOG = logging.getLogger(__name__)


def get_chromosomes(
    db: Database[Any], genome_build: GenomeBuild
) -> list[ReducedChromInfo]:
    """Gets the size in base pairs of a chromosome."""
    chrom_data = db[CHROMSIZES_COLLECTION].find(
        {"genome_build": genome_build}, {"_id": False, "chrom": True, "size": True}
    )
    return [ReducedChromInfo.model_validate(chrom) for chrom in chrom_data]


def get_chromosome_info(
    db: Database[Any], chromosome: Chromosome, genome_build: GenomeBuild
) -> ChromInfo | None:
    """Gets the size in base pairs of a chromosome."""
    chrom_data = db[CHROMSIZES_COLLECTION].find_one(
        {
            "chrom": chromosome,
            "genome_build": genome_build,
        }
    )
    if chrom_data is None:
        LOG.warning(
            "Could not find data for chromosome %s in DB; genome_build: %d",
            chromosome,
            genome_build,
        )
        return None
    return ChromInfo.model_validate(chrom_data)
