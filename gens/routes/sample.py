"""Routes for getting coverage information."""

from http import HTTPStatus
from pathlib import Path
from typing import Literal

from fastapi import APIRouter

from gens.crud import samples
from gens.db.collections import SAMPLES_COLLECTION
from gens.io import get_overview_data, get_overview_from_tabix, get_scatter_data
from gens.models.genomic import Chromosome, GenomeBuild, GenomicRegion
from gens.models.sample import (
    GenomeCoverage,
    MultipleSamples,
    SampleInfo,
    ScatterDataType,
)

from .utils import ApiTags, GensDb

router = APIRouter(prefix="/samples")


@router.post("/sample", tags=[ApiTags.SAMPLE], status_code=HTTPStatus.CREATED)
async def create_sample(sample: SampleInfo, db: GensDb):
    """Create a new sample in the database."""
    samples.create_sample(db, sample)


@router.get("/", tags=[ApiTags.SAMPLE])
async def get_multiple_samples(
    db: GensDb, skip: int = 0, limit: int | None = None
) -> MultipleSamples:
    """Query the database for multiple samples.

    The result can be narrowed using skip and limit.
    """
    resp = samples.get_samples(samples_c=db[SAMPLES_COLLECTION], limit=limit, skip=skip)
    return resp


@router.get("/sample", tags=[ApiTags.SAMPLE])
async def get_sample_route(
    sample_id: str, case_id: str, genome_build: GenomeBuild, db: GensDb
) -> SampleInfo:
    sample_info: SampleInfo = samples.get_sample(
        db[SAMPLES_COLLECTION],
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
    )
    return sample_info


@router.get(
    "/sample/{data_type}",
    tags=[ApiTags.SAMPLE],
)
async def get_genome_coverage(
    sample_id: str,
    case_id: str,
    data_type: ScatterDataType,
    chromosome: Chromosome,
    genome_build: GenomeBuild,
    db: GensDb,
    start: int = 1,
    end: int | None = None,
    zoom_level: Literal["o", "a", "b", "c", "d"] = "a",
) -> GenomeCoverage:
    """Get genome coverage information."""

    region = GenomicRegion(chromosome=chromosome, start=start, end=end)

    return get_scatter_data(
        collection=db.get_collection(SAMPLES_COLLECTION),
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
        region=region,
        data_type=data_type,
        zoom_level=zoom_level,
    )


@router.get("/sample/{data_type}/overview", tags=[ApiTags.SAMPLE])
async def get_cov_overview(
    sample_id: str,
    case_id: str,
    data_type: ScatterDataType,
    genome_build: GenomeBuild,
    db: GensDb,
):
    """Get aggregated overview coverage information."""

    sample_info: SampleInfo = samples.get_sample(
        db[SAMPLES_COLLECTION],
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
    )

    return get_overview_from_tabix(sample_info, data_type)
