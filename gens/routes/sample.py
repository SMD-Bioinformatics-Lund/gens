"""Routes for getting coverage information."""

from fastapi import APIRouter
from gens.crud.samples import get_sample
from gens.models.genomic import Chromosome, GenomicRegion
from gens.models.sample import GenomeCoverage, SampleInfo
from gens.io import get_overview_data, get_scatter_data
from gens.db.collections import SAMPLES_COLLECTION

from .root import API_BASE_URL
from .utils import ApiTags, ScatterDataType, GensDb


router = APIRouter(prefix=f"{API_BASE_URL}/sample")


@router.get(
    "/coverage",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_coverage(
    sample_id: str,
    case_id: str,
    chromosome: Chromosome,
    start: int,
    end: int,
    db: GensDb,
) -> GenomeCoverage:
    """Get genome coverage information."""

    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    return get_scatter_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region=region, cov_or_baf='cov')


@router.get(
    "/baf",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_baf(
    sample_id: str,
    case_id: str,
    chromosome: Chromosome,
    start: int,
    end: int,
    db: GensDb,
) -> GenomeCoverage:
    """Get genome beta allele frequency information."""

    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    return get_scatter_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region=region, cov_or_baf='baf')


@router.get("/overview/{data_type}", tags=[ApiTags.SAMPLE])
async def get_cov_overview(
    sample_id: str,
    case_id: str,
    data_type: ScatterDataType,
    db: GensDb,
):
    """Get aggregated overview coverage information."""

    sample_info: SampleInfo = get_sample(db[SAMPLES_COLLECTION], sample_id=sample_id, case_id=case_id)

    return get_overview_data(sample_info.overview_file, data_type)