from fastapi import APIRouter

from gens.routes.utils import AdapterDep, ApiTags


router = APIRouter(prefix="/gene_lists")


@router.get("/", tags=[ApiTags.GENE_LIST])
async def get_gene_lists(variant_adapter: AdapterDep) -> list[tuple[str, str]]:
    """Get ID and name of all available gene lists"""

    return variant_adapter.get_panels()

