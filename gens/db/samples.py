"""Store and retrive samples from the database."""

import datetime
import itertools
import logging
from gens.models.base import GenomeBuild, RWModel, CreatedAtModel

from pymongo import MongoClient
from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError

LOG = logging.getLogger(__name__)

COLLECTION = "samples"


class SampleNotFoundError(Exception):
    def __init__(self, message: str, sample_id: str):
        super().__init__(message)

        self.sample_id = sample_id


class NonUniqueIndexError(Exception):
    def __init__(self, message: str, sample_id: str, case_id: str, genome_build: str):
        super().__init__(message)

        self.sample_id = sample_id
        self.case_id = case_id
        self.genome_build = genome_build


class SampleInfo(RWModel, CreatedAtModel):
    """Sample record stored in the database."""

    sample_id: str
    case_id: str
    genome_build: GenomeBuild
    baf_file: str
    coverage_file: str
    overview_file: str


def store_sample(
    db: MongoClient,
    sample_id: str,
    case_id: str,
    genome_build: int,
    baf: str,
    coverage: str,
    overview: str,
    force: bool,
):
    """Store a new sample in the database."""
    LOG.info(f'Store sample "{sample_id}" in database')
    sample_obj = SampleInfo(
        sample_id=sample_id, case_id=case_id, genome_build=GenomeBuild(int(genome_build)),
        baf_file=baf, coverage_file=coverage, overview_file=overview
    )
    if force:
        result = db[COLLECTION].update_one(
            {
                "sample_id": sample_id,
                "case_id": case_id,
                "genome_build": genome_build,
            },
            {
                "$set": sample_obj.model_dump()
            },
            upsert=True,
        )
        if result.modified_count == 1:
            LOG.error(
                f'Sample with sample_id="{sample_id}" and case_id="{case_id}" was overwritten.'
            )
        if result.modified_count > 1:
            raise NonUniqueIndexError(
                f'More than one entry matched sample_id="{sample_id}", case_id="{case_id}", and genome_build="{genome_build}". This should never happen.',
                sample_id,
                case_id,
                genome_build,
            )
    else:
        try:
            db[COLLECTION].insert_one(sample_obj.model_dump())
        except DuplicateKeyError:
            LOG.error(
                f'DuplicateKeyError while storing sample with sample_id="{sample_id}" and case_id="{case_id}" in database.'
            )


def get_samples(db: MongoClient, start:int = 0, n_samples: int|None = None) -> tuple[list[SampleInfo], int]:
    """
    Get samples stored in the databse.

    use n_samples to limit the results to x most recent samples
    """
    results = (
        SampleInfo(
            sample_id=r["sample_id"],
            case_id=r["case_id"],
            genome_build=GenomeBuild(int(r["genome_build"])),
            baf_file=r["baf_file"],
            coverage_file=r["coverage_file"],
            overview_file=r["overview_file"],
            created_at=r["created_at"],
        )
        for r in db[COLLECTION].find().sort("created_at", DESCENDING)
    )
    # limit results to n results
    if isinstance(n_samples, (int)) and 0 < n_samples:
        results = itertools.islice(results, start, start + n_samples)
    return results, db[COLLECTION].count_documents({})


def query_sample(db: MongoClient, sample_id: str, case_id: str|None, _genome_build: int) -> SampleInfo:
    """Get a sample with id."""
    result = None
    if case_id is None:
        result = db[COLLECTION].find_one({"sample_id": sample_id})
    else:
        result = db[COLLECTION].find_one({"sample_id": sample_id, "case_id": case_id})

    if result is None:
        raise SampleNotFoundError(f'No sample with id: "{sample_id}" in database', sample_id)
    return SampleInfo(
        sample_id=result["sample_id"],
        case_id=result["case_id"],
        genome_build=GenomeBuild(int(result["genome_build"])),
        baf_file=result["baf_file"],
        coverage_file=result["coverage_file"],
        overview_file=result["overview_file"],
        created_at=result["created_at"],
    )


def delete_sample(db: MongoClient, sample_id: str, case_id: str, genome_build: int):
    """Remove a sample from the database."""
    LOG.info(f'Removing sample "{sample_id}" from database')
    db[COLLECTION].delete_one(
        {
            "sample_id": sample_id,
            "case_id": case_id,
            "genome_build": genome_build,
        }
    )
