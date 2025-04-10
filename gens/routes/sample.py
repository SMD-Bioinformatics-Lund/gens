"""Routes for getting coverage information."""

from fastapi import APIRouter
from gens.crud.samples import get_sample
from gens.models.genomic import Chromosome, GenomicRegion
from gens.models.sample import GenomeCoverage, SampleInfo, ScatterDataType
from gens.io import get_overview_data, get_scatter_data
from gens.db.collections import SAMPLES_COLLECTION

from .utils import ApiTags, GensDb


router = APIRouter(prefix="/sample")


@router.get(
    "/{data_type}",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_coverage(
    sample_id: str,
    case_id: str,
    data_type: ScatterDataType,
    chromosome: Chromosome,
    start: int,
    end: int,
    db: GensDb,
) -> GenomeCoverage:
    """Get genome coverage information."""

    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    return get_scatter_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region=region, cov_or_baf=data_type)


@router.get("/{data_type}/overview", tags=[ApiTags.SAMPLE])
async def get_cov_overview(
    sample_id: str,
    case_id: str,
    data_type: ScatterDataType,
    db: GensDb,
):
    """Get aggregated overview coverage information."""

    sample_info: SampleInfo = get_sample(db[SAMPLES_COLLECTION], sample_id=sample_id, case_id=case_id)

    return get_overview_data(sample_info.overview_file, data_type)