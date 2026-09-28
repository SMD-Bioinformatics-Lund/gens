"""CRUD operations for sample info."""

import logging
from datetime import timezone
from pathlib import Path
from typing import Any, Dict, List

from pymongo import DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from gens.crud.sample_annotations import delete_sample_annotation_tracks_for_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.exceptions import NonUniqueIndexError, SampleNotFoundError
from gens.models.genomic import GenomeBuild
from gens.models.sample import MetaEntry, MultipleSamples, SampleInfo

LOG = logging.getLogger(__name__)


INDEX_FIELDS: set[str] = {"baf_index", "coverage_index"}


def update_sample(db: Database[Any], sample_obj: SampleInfo) -> None:
    """Update an existing sample in the database."""
    samples_c = db.get_collection(SAMPLES_COLLECTION)
    validate_case_genome_build_consistency(
        samples_c=samples_c,
        case_id=sample_obj.case_id,
        genome_build=sample_obj.genome_build,
    )
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


def create_sample(db: Database[Any], sample_obj: SampleInfo) -> bool:
    """Store a new sample in the database.

    Return True when inserted, False when a duplicate key prevented insertion.
    """
    LOG.info(f"Store sample {sample_obj.sample_id} in database")
    samples_c = db.get_collection(SAMPLES_COLLECTION)
    validate_case_genome_build_consistency(
        samples_c=samples_c,
        case_id=sample_obj.case_id,
        genome_build=sample_obj.genome_build,
    )
    try:
        samples_c.insert_one(sample_obj.model_dump(exclude=INDEX_FIELDS))
        return True
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
        return False


def validate_case_genome_build_consistency(
    samples_c: Collection[dict[str, Any]],
    case_id: str,
    genome_build: GenomeBuild,
) -> None:
    """Reject mixed-build cases at write time.

    A case is expected to belong to a single genome build. Allowing both 37/38
    under one case leads to ambiguous viewer behavior and ID collisions.
    """
    mismatch = samples_c.find_one(
        {"case_id": case_id, "genome_build": {"$ne": genome_build}}
    )
    if mismatch is not None:
        existing_build = mismatch.get("genome_build")
        msg = (
            f'Case "{case_id}" already has samples for genome build "{existing_build}". '
            f'Cannot add/update sample with genome build "{genome_build}".'
        )
        raise ValueError(msg)


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
) -> Dict[tuple[str, int], List[dict[str, Any]]]:

    cursor = samples_c.find().sort("created_at", DESCENDING).skip(skip)
    if limit is not None:
        cursor.limit(limit)

    case_to_samples: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for sample in cursor:
        # try:
        #     sample_data = SampleInfo.model_validate(sample)
        # except ValidationError as err:
        #     LOG.error(f"Failed to load sample: {sample}")
        #     continue

        case_id = sample["case_id"]
        genome_build = sample["genome_build"]
        case_key = (case_id, genome_build)
        if not case_to_samples.get(case_key):
            case_to_samples[case_key] = []

        # baf_file_exists = Path(sample.get("baf_file", "")).is_file()
        # cov_file_exists = Path(sample.get("coverage_file", "")).is_file()

        sample_obj = {
            "case_id": sample["case_id"],
            "display_case_id": sample.get("display_case_id"),
            "sample_id": sample["sample_id"],
            "sample_type": sample.get("sample_type"),
            "sex": sample.get("sex"),
            "genome_build": sample["genome_build"],
            "files_present": bool(sample["baf_file"] and sample["coverage_file"]),
            "created_at": sample["created_at"].astimezone(timezone.utc).isoformat(),
        }

        case_to_samples[case_key].append(sample_obj)

    return case_to_samples


def get_samples_for_case(
    samples_c: Collection[dict[str, Any]],
    case_id: str,
) -> list[SampleInfo]:

    cursor = samples_c.find({"case_id": case_id}).sort("created_at", DESCENDING)

    samples: list[SampleInfo] = []
    for result in cursor:

        sample_meta = [MetaEntry.model_validate(m) for m in result.get("meta", [])]

        baf_file = Path(result["baf_file"])
        coverage_file = Path(result["coverage_file"])
        for file_path in (baf_file, coverage_file):
            if not file_path.is_file():
                raise FileNotFoundError(f"{file_path} was not found")
            index_path = file_path.with_suffix(file_path.suffix + ".tbi")
            if not index_path.is_file():
                raise FileNotFoundError(f"{index_path} was not found")

        sample = SampleInfo(
            sample_id=result["sample_id"],
            case_id=result["case_id"],
            display_case_id=result.get("display_case_id"),
            genome_build=GenomeBuild(int(result["genome_build"])),
            baf_file=baf_file,
            coverage_file=coverage_file,
            sample_type=result.get("sample_type"),
            sex=result.get("sex"),
            meta=sample_meta,
            created_at=result["created_at"],
        )
        samples.append(sample)

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
        raise SampleNotFoundError(
            f'No sample with id: "{sample_id}" in database', sample_id
        )

    sample_meta = [MetaEntry.model_validate(m) for m in result.get("meta", [])]

    baf_file = result["baf_file"]
    cov_file = result["coverage_file"]

    baf_file_missing = not Path(baf_file).is_file()
    cov_file_missing = not Path(cov_file).is_file()

    nbr_missing = baf_file_missing + cov_file_missing

    if nbr_missing > 0:
        error_msgs = []
        if baf_file_missing:
            error_msgs.append(f"BAF file {baf_file} not found on disk")
        if cov_file_missing:
            error_msgs.append(f"Coverage file {cov_file} not found on disk")
        raise FileNotFoundError(
            "Encountered errors while accessing sample files: " + "\n".join(error_msgs)
        )

    return SampleInfo(
        sample_id=result["sample_id"],
        case_id=result["case_id"],
        display_case_id=result.get("display_case_id"),
        genome_build=GenomeBuild(int(result["genome_build"])),
        baf_file=baf_file,
        coverage_file=cov_file,
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

    removed_tracks = delete_sample_annotation_tracks_for_sample(
        genome_build=genome_build, db=db, sample_id=sample_id, case_id=case_id
    )
    if removed_tracks:
        LOG.info(
            "Removed %s sample annotation track(s) for sample %s",
            removed_tracks,
            sample_id,
        )

    samples_c.delete_one(
        {
            "sample_id": sample_id,
            "case_id": case_id,
            "genome_build": genome_build,
        }
    )


def get_sample_ids_for_case_and_build(
    samples_c: Collection[dict[str, Any]],
    case_id: str,
    genome_build: GenomeBuild,
) -> list[str]:
    return [
        sample["sample_id"]
        for sample in samples_c.find({"case_id": case_id, "genome_build": genome_build})
    ]
