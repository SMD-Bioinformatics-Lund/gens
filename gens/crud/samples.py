"""CRUD operations for sample info."""

from datetime import timezone
import logging
from typing import Any, Dict, List

from pydantic import ValidationError
from pymongo import DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from gens.db.collections import SAMPLES_COLLECTION
from gens.exceptions import NonUniqueIndexError, SampleNotFoundError
from gens.models.genomic import GenomeBuild
from gens.models.sample import MetaEntry, MultipleSamples, SampleInfo

LOG = logging.getLogger(__name__)


INDEX_FIELDS: set[str] = {"baf_index", "coverage_index"}


def update_sample(db: Database[Any], sample_obj: SampleInfo) -> None:
    """Update an existing sample in the database."""
    result = db.get_collection(SAMPLES_COLLECTION).update_one(
        {
            "sample_id": sample_obj.sample_id,
            "case_id": sample_obj.case_id,
            "genome_build": sample_obj.genome_build,
        },
        {"$set": sample_obj.model_dump(exclude=INDEX_FIELDS)},
        upsert=True,
    )
    if result.modified_count == 1:
        LOG.info(
            'Sample with sample_id="%s", case_id="%s", genome_build="%s" was overwritten.',
            sample_obj.sample_id,
            sample_obj.case_id,
            sample_obj.genome_build,
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


def create_sample(db: Database[Any], sample_obj: SampleInfo) -> None:
    """Store a new sample in the database."""
    LOG.info(f"Store sample {sample_obj.sample_id} in database")
    try:
        db.get_collection(SAMPLES_COLLECTION).insert_one(
            sample_obj.model_dump(exclude=INDEX_FIELDS)
        )
    except DuplicateKeyError:
        LOG.error(
            (
                "DuplicateKeyError while storing sample "
                'with sample_id="%s", case_id="%s" and genome_build="%s" in database.'
            ),
            sample_obj.sample_id,
            sample_obj.case_id,
            sample_obj.genome_build,
        )


def get_samples(
    samples_c: Collection[dict[str, Any]], skip: int = 0, limit: int | None = None
) -> MultipleSamples:
    """
    Get samples stored in the databse.

    use n_samples to limit the results to x most recent samples
    """
    # build query
    cursor = samples_c.find().sort("created_at", DESCENDING).skip(skip)
    if limit is not None:
        cursor.limit(limit)

    # cast as sample object
    result = MultipleSamples(
        data=[SampleInfo.model_validate(sample) for sample in cursor],
        # mypy cannot deal with the pydantic alias records_total -> recordsTotal, thus the ignore
        recordsTotal=samples_c.count_documents({}),  # type: ignore
    )
    return result


# FIXME: This needs to be more properly reworked to deal with cases
# FIXME: Using the TmpSample class as a temporary solution to speed up loading compared to pydantic checking
# When doing this checking on many samples, it takes some time
def get_samples_per_case(
    samples_c: Collection[dict[str, Any]], skip: int = 0, limit: int | None = None
) -> Dict[str, List[dict[str, Any]]]:

    cursor = samples_c.find().sort("created_at", DESCENDING).skip(skip)
    if limit is not None:
        cursor.limit(limit)

    case_to_samples: dict[str, list[dict[str, Any]]] = {}
    for sample in cursor:
        # try:
        #     sample_data = SampleInfo.model_validate(sample)
        # except ValidationError as err:
        #     LOG.error(f"Failed to load sample: {sample}")
        #     continue

        case_id = sample["case_id"]
        # case_id = sample_data.case_id
        if not case_to_samples.get(case_id):
            case_to_samples[case_id] = []
        sample_obj = {
            "case_id": sample["case_id"],
            "sample_id": sample["sample_id"],
            "sample_type": sample.get("sample_type"),
            "sex": sample.get("sex"),
            "genome_build": sample["genome_build"],
            "has_overview_file": sample["overview_file"] is not None,
            "files_present": bool(sample["baf_file"] and sample["coverage_file"]),
            "created_at": sample["created_at"].astimezone(timezone.utc).isoformat(),
        }

        case_to_samples[case_id].append(sample_obj)

    return case_to_samples


def get_samples_for_case(
    samples_c: Collection[dict[str, Any]],
    case_id: str,
) -> list[SampleInfo]:
    cursor = samples_c.find({"case_id": case_id}).sort("created_at", DESCENDING)

    LOG.warning(f">>> inside get samples for case {case_id}")

    samples: list[SampleInfo] = []
    for sample in cursor:
        LOG.warning(f">>> iterating sample {sample}")
        sample_obj = {
            "case_id": sample["case_id"],
            "sample_id": sample["sample_id"],
            "sample_type": sample.get("sample_type"),
            "sex": sample.get("sex"),
            "genome_build": sample["genome_build"],
            "has_overview_file": sample["overview_file"] is not None,
            "files_present": bool(sample["baf_file"] and sample["coverage_file"]),
            "created_at": sample["created_at"].astimezone(timezone.utc).isoformat(),
        }
        sample = SampleInfo.model_validate(sample_obj)
        samples.append(sample)
    LOG.warning(f">>> returning samples: {samples}")
    
    return samples
    

def get_sample(
    samples_c: Collection[dict[str, Any]],
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild | None = None,
) -> SampleInfo:
    """Get a sample with id."""
    sample_filter: dict[str, Any] = {
        "sample_id": sample_id,
        "case_id": case_id,
    }
    if genome_build is not None:
        sample_filter["genome_build"] = genome_build

    result = samples_c.find_one(sample_filter)

    if result is None:
        raise SampleNotFoundError(f'No sample with id: "{sample_id}" in database', sample_id)

    overview_file = result.get("overview_file")
    if overview_file == "None":
        overview_file = None

    sample_meta = [MetaEntry.model_validate(m) for m in result.get("meta", [])]

    return SampleInfo(
        sample_id=result["sample_id"],
        case_id=result["case_id"],
        genome_build=GenomeBuild(int(result["genome_build"])),
        baf_file=result["baf_file"],
        coverage_file=result["coverage_file"],
        overview_file=overview_file,
        sample_type=result.get("sample_type"),
        sex=result.get("sex"),
        meta=sample_meta,
        created_at=result["created_at"],
    )


def delete_sample(
    db: Database[Any], sample_id: str, case_id: str, genome_build: GenomeBuild
) -> None:
    """Remove a sample from the database."""

    LOG.info('Removing sample "%s" from database', sample_id)

    sample_filter: dict[str, str | GenomeBuild] = {
        "sample_id": sample_id,
        "case_id": case_id,
        "genome_build": genome_build,
    }

    samples_c = db.get_collection(SAMPLES_COLLECTION)
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
