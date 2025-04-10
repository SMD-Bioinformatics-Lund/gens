"""CRUD operations for sample info."""

import itertools
import logging
from typing import Any, Iterator

from pymongo import DESCENDING
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError

from gens.exceptions import NonUniqueIndexError, SampleNotFoundError
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleInfo

LOG = logging.getLogger(__name__)


INDEX_FIELDS: set[str] = {"baf_index", "coverage_index"}


def update_sample(samples_c: Collection[dict[str, Any]], sample_obj: SampleInfo) -> None:
    """Update an existing sample in the database."""
    result = samples_c.update_one(
        {
            "sample_id": sample_obj.sample_id,
            "case_id": sample_obj.case_id,
            "genome_build": sample_obj.genome_build,
        },
        {"$set": sample_obj.model_dump(exclude=INDEX_FIELDS)},
        upsert=True,
    )
    if result.modified_count == 1:
        LOG.error(
            'Sample with sample_id="%s" and case_id="%s" was overwritten.',
            sample_obj.sample_id,
            sample_obj.case_id,
        )
    if result.modified_count > 1:
        raise NonUniqueIndexError(
            (
                f'More than one entry matched sample_id="{sample_obj.sample_id}", '
                f'case_id="{sample_obj.case_id}", and genome_build="{sample_obj.genome_build}".'
                "This should never happen."
            ),
            sample_obj.sample_id,
            sample_obj.case_id,
            str(sample_obj.genome_build),
        )


def create_sample(samples_c: Collection[dict[str, Any]], sample_obj: SampleInfo) -> None:
    """Store a new sample in the database."""
    LOG.info(f'Store sample {sample_obj.sample_id} in database')
    try:
        samples_c.insert_one(sample_obj.model_dump(exclude=INDEX_FIELDS))
    except DuplicateKeyError:
        LOG.error(
            (
                "DuplicateKeyError while storing sample "
                'with sample_id="%s" and case_id="%s" in database.'
            ),
            sample_obj.sample_id,
            sample_obj.case_id,
        )


def get_samples(
    samples_c: Collection[dict[str, Any]], start: int = 0, n_samples: int | None = None
) -> tuple[list[SampleInfo], int]:
    """
    Get samples stored in the databse.

    use n_samples to limit the results to x most recent samples
    """
    results: Iterator[SampleInfo] = (
        SampleInfo(
            sample_id=r["sample_id"],
            case_id=r["case_id"],
            genome_build=GenomeBuild(int(r["genome_build"])),
            baf_file=r["baf_file"],
            coverage_file=r["coverage_file"],
            overview_file=r["overview_file"],
            created_at=r["created_at"],
        )
        for r in samples_c.find().sort("created_at", DESCENDING)
    )
    # limit results to n results
    if isinstance(n_samples, (int)) and 0 < n_samples:
        results = itertools.islice(results, start, start + n_samples)

    return list(results), samples_c.count_documents({})


def get_sample(samples_c: Collection[dict[str, Any]], sample_id: str, case_id: str | None) -> SampleInfo:
    """Get a sample with id."""
    result = None
    if case_id is None:
        result = samples_c.find_one({"sample_id": sample_id})
    else:
        result = samples_c.find_one({"sample_id": sample_id, "case_id": case_id})

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


def delete_sample(
    samples_c: Collection[dict[str, Any]], sample_id: str, case_id: str, genome_build: GenomeBuild
) -> None:
    """Remove a sample from the database."""

    LOG.info('Removing sample "%s" from database', sample_id)

    sample_filter: dict[str, str | GenomeBuild] = {
        "sample_id": sample_id,
        "case_id": case_id,
        "genome_build": genome_build,
    }

    result = samples_c.find_one(sample_filter)

    if result is None:
        msg = f'No sample found with case_id: "{case_id}", sample_id: "{sample_id}", genome_build: "{genome_build}"'
        raise SampleNotFoundError(msg, sample_id)

    samples_c.delete_one(
        {
            "sample_id": sample_id,
            "case_id": case_id,
            "genome_build": genome_build,
        }
    )
