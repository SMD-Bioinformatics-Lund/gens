"""Routes for getting coverage information."""

from typing import Any, Annotated

from fastapi import APIRouter, Depends, Query
from gens.crud.samples import get_sample
from gens.models.sample import GenomeCoverage, SampleInfo
from pymongo.database import Database
from gens.io import get_overview_data, get_scatter_data
from gens.db.db import get_db
from gens.db.collections import SAMPLES_COLLECTION

from .utils import ApiTags, ScatterDataType


router = APIRouter(prefix="/sample")


@router.get(
    "/coverage",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_coverage(
    sample_id: str,
    case_id: str,
    region: Annotated[list[str], Query(min_length=1)],
    db: Database[Any] = Depends(get_db),
) -> list[GenomeCoverage]:
    """Get genome coverage information."""

    return [get_scatter_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region_str=reg, cov_or_baf='cov') for reg in region]


@router.get(
    "/baf",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_baf(
    sample_id: str,
    case_id: str,
    region: Annotated[list[str], Query(min_length=1)],
    db: Database[Any] = Depends(get_db),
) -> list[GenomeCoverage]:
    """Get genome beta allele frequency information."""

    return [get_scatter_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region_str=reg, cov_or_baf='baf') for reg in region]


@router.get("/overview/{data_type}", tags=[ApiTags.SAMPLE])
async def get_cov_overview(
    sample_id: str,
    case_id: str,
    data_type: ScatterDataType,
    db: Database[Any] = Depends(get_db),
):
    """Get aggregated overview coverage information."""

    sample_info: SampleInfo = get_sample(db[SAMPLES_COLLECTION], sample_id=sample_id, case_id=case_id)

    return get_overview_data(sample_info.overview_file, data_type)