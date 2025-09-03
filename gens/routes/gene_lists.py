from fastapi import APIRouter

from gens.crud.genomic import get_chromosome_info
from gens.models.annotation import GeneListRecord, SimplifiedTranscriptInfo
from gens.models.genomic import Chromosome, GenomeBuild, GenomicRegion
from gens.routes.utils import AdapterDep, ApiTags, GensDb


router = APIRouter(prefix="/gene_lists")


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
    
    chrom_info = get_chromosome_info(db, chromosome, genome_build)
    if chrom_info is None:
        return []

    region = GenomicRegion(chromosome=chromosome, start=1, end=chrom_info.size)
    transcripts = crud_get_transcripts(region, genome_build, db)
    gene_set = gene_names
    return [tr for tr in transcripts if tr.name in gene_set]
