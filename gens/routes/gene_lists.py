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

    all_matches: list[SimplifiedTranscriptInfo] = []
    for gene_name in gene_names[0:1]:

        LOG.warning(f"Looking for gene name {gene_name}")

        matches = get_simplified_transcripts_by_gene_symbol(
            gene_name, genome_build, db, only_mane=True
        )
        LOG.warning(f">>> Matches {matches}")
        all_matches.extend(matches)
        # mane_matching = [tr for tr in all_matching if tr.mane in canonical_types]
        # if len(mane_matching) > 0:
        #     target_transcript = mane_matching[0]
        #     simplified_record = SimplifiedTranscriptInfo.model_validate(
        #         {
        #             "features": _format_features(target_transcript.features),
        #             "strand": target_transcript.strand,
        #             "is_protein_coding": target_transcript.transcript_biotype == "protein_coding",
        #         }
        #     )
        #     all_matches.append(simplified_record)
        # else:
        #     LOG.warning(f">>> No matches for symbol {gene_name}")

    LOG.warning(">>> test7")
    # result =  [tr for tr in transcripts if tr.name in gene_set and tr.type in canonical_types]
    LOG.warning(">>> test8")
    return all_matches
