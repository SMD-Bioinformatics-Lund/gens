import logging
from fastapi import APIRouter

from gens.crud.genomic import get_chromosome_info
from gens.constants import MANE_SELECT, MANE_PLUS_CLINICAL, ENSEMBL_CANONICAL
from gens.crud.transcripts import (
    _format_features,
    get_simplified_transcripts_by_gene_symbol,
    get_transcripts,
    get_transcripts_by_gene_symbol,
)
from gens.models.annotation import GeneListRecord, SimplifiedTranscriptInfo
from gens.models.genomic import Chromosome, GenomeBuild, GenomicRegion
from gens.routes.utils import AdapterDep, ApiTags, GensDb


router = APIRouter(prefix="/gene_lists")

LOG = logging.getLogger(__name__)


@router.get("/", tags=[ApiTags.GENE_LIST])
async def get_gene_lists(variant_adapter: AdapterDep) -> list[GeneListRecord]:
    """Get ID and name of all available gene lists"""

    return variant_adapter.get_gene_lists()


@router.get("/track/{panel_id}", tags=[ApiTags.GENE_LIST])
async def get_gene_list_track(
    panel_id: str,
    chromosome: Chromosome,
    genome_build: GenomeBuild,
    variant_adapter: AdapterDep,
    db: GensDb,
) -> list[SimplifiedTranscriptInfo]:
    """Get gene list entries"""

    gene_names = variant_adapter.get_panel(panel_id)
    if not gene_names:
        return []

    all_matches: list[SimplifiedTranscriptInfo] = []
    for gene_name in gene_names:

        matches = get_simplified_transcripts_by_gene_symbol(
            gene_name, genome_build, db, only_mane=True
        )

        matches_in_chr = [tr for tr in matches if tr.chrom == chromosome.value]
        all_matches.extend(matches_in_chr)


    return all_matches
