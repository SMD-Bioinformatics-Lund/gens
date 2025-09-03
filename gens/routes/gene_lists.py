import logging
from fastapi import APIRouter

from gens.crud.genomic import get_chromosome_info
from gens.constants import MANE_SELECT, MANE_PLUS_CLINICAL, ENSEMBL_CANONICAL
from gens.crud.transcripts import get_transcripts, get_transcripts_by_gene_symbol
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

    LOG.warning(">>> test1")

    gene_names = variant_adapter.get_panel(panel_id)
    if not gene_names:
        return []

    LOG.warning(">>> test2")

    # chrom_info = get_chromosome_info(db, chromosome, genome_build)
    # if chrom_info is None:
    #     return []

    LOG.warning(">>> test3")

    # region = GenomicRegion(chromosome=chromosome, start=1, end=chrom_info.size)
    LOG.warning(">>> test4")
    # FIXME: This is slow. How to do direct lookup
    # transcripts = get_transcripts(region, genome_build, db)

    # FIXME: Looks like something is coming from the transcript matching now
    # but seems 

    canonical_types = {MANE_SELECT, MANE_PLUS_CLINICAL, ENSEMBL_CANONICAL}
    all_matches = []
    for gene_name in gene_names:

        LOG.warning(f"Looking for gene name {gene_name}")

        transcripts = get_transcripts_by_gene_symbol(gene_name, genome_build, db)
        result =  [tr for tr in transcripts if tr.mane in canonical_types]
        if len(result) > 0:
            all_matches.append(result[0])
        else:
            LOG.warning(f">>> No matches for symbol {gene_name}")

    LOG.warning(">>> test7")
    # result =  [tr for tr in transcripts if tr.name in gene_set and tr.type in canonical_types]
    LOG.warning(">>> test8")
    return all_matches
