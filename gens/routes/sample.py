"""Routes for getting coverage information."""

from typing import Any

from fastapi import APIRouter, Depends
from gens.models.sample import GenomeCoverage
from pymongo.database import Database
from gens.io import dev_get_data
from gens.db import get_db_connection
from gens.db.collections import SAMPLES_COLLECTION

from .utils import ApiTags


router = APIRouter(prefix="/sample")


@router.get(
    "/coverage",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_coverage(
    sample_id: str,
    case_id: str,
    region: list[str],
    db: Database[Any] = Depends(get_db_connection),
) -> list[GenomeCoverage]:
    """Get genome coverage information."""

    return [dev_get_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region_str=reg, cov_or_baf='cov') for reg in region]


@router.get(
    "/baf",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_baf(
    sample_id: str,
    case_id: str,
    region: list[str],
    db: Database[Any] = Depends(get_db_connection),
) -> list[GenomeCoverage]:
    """Get genome beta allele frequency information."""

    return [dev_get_data(collection=db.get_collection(SAMPLES_COLLECTION), sample_id=sample_id, case_id=case_id, region_str=reg, cov_or_baf='baf') for reg in region]
