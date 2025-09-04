import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pymongo.database import Database

from gens.crud.annotations import create_annotation_track, get_annotation_track
from gens.load.annotations import (
    fmt_aed_to_annotation,
    fmt_bed_to_annotation,
    parse_aed_file,
    parse_bed_file,
    parse_tsv_file,
)
from gens.models.annotation import AnnotationRecord, AnnotationTrack
from gens.models.base import PydanticObjectId
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)


@dataclass
class InsertTrackResult:
    track_in_db: bool
    track_id: PydanticObjectId


def upsert_annotation_track(
    db: Database, annot_file: Path, genome_build: GenomeBuild
) -> InsertTrackResult:
    annotation_name = annot_file.name[: -len(annot_file.suffix)]
    existing_track = get_annotation_track(
        name=annotation_name, genome_build=genome_build, db=db
    )

    if existing_track is None:
        track = AnnotationTrack(
            name=annotation_name, description="", genome_build=genome_build
        )
        track_id = create_annotation_track(track, db)
    else:
        track_id = existing_track.track_id

    return InsertTrackResult(track_in_db=existing_track is not None, track_id=track_id)


@dataclass
class ParseRawResult:
    records: list
    file_meta: list


# FIXME: Reduce complexity to satisfy flake8 warnings
def parse_raw_records(
    file_format: str,
    is_tsv: bool,
    file: Path,
    ignore_errors: bool,
    track_result: InsertTrackResult,
    genome_build: GenomeBuild,
) -> ParseRawResult:

    file_meta: list[dict[str, Any]] = []
    records: list[AnnotationRecord] = []

    if is_tsv:
        file_format = "tsv"

    if file_format == "tsv":
        for rec in parse_tsv_file(file):
            validated_rec = AnnotationRecord.model_validate(
                {"track_id": track_result.track_id, "genome_build": genome_build, **rec}
            )
            records.append(validated_rec)

    elif file_format == "bed":
        for rec in parse_bed_file(file):
            parsed_rec = fmt_bed_to_annotation(rec, track_result.track_id, genome_build)
            records.append(parsed_rec)

    elif file_format == "aed":
        file_meta, aed_records = parse_aed_file(file, ignore_errors)
        records = []
        for rec in aed_records:
            try:
                formatted_rec = fmt_aed_to_annotation(
                    rec, track_result.track_id, genome_build
                )
            except ValueError:
                LOG.warning("Failed to format rec to annotation: %s", rec)
                if not ignore_errors:
                    raise
                continue

            if formatted_rec is not None:
                records.append(formatted_rec)
    else:
        raise ValueError(f'Unfamiliar file format detected: "{file_format}"')
    return ParseRawResult(records=records, file_meta=file_meta)
