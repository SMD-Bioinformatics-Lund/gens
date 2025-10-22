import logging

from fastapi import APIRouter

from gens.models.annotation import GeneListRecord
from gens.routes.utils import AdapterDep, ApiTags

router = APIRouter(prefix="/gene_lists")

LOG = logging.getLogger(__name__)


@router.get("/", tags=[ApiTags.GENE_LIST])
async def get_gene_lists(variant_adapter: AdapterDep) -> list[GeneListRecord]:
    """Get ID and name of all available gene lists"""

    return variant_adapter.get_gene_lists()


@router.get("/track/{panel_id}", tags=[ApiTags.GENE_LIST])
async def get_gene_list_symbols(
    panel_id: str,
    variant_adapter: AdapterDep,
) -> list[str]:
    """Get gene list entries"""

    gene_names = variant_adapter.get_gene_list(panel_id)
    return gene_names
