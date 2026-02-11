"""Helpers for CLI load commands."""

from logging import Logger
from pathlib import Path

import click

from gens.cli.util import db as cli_db
from gens.cli.util.annotations import parse_raw_records, upsert_annotation_track
from gens.cli.util.util import normalize_sample_type
from gens.crud.annotations import (
    create_annotations_for_track,
    delete_annotation_track,
    delete_annotations_for_track,
    register_data_update,
    update_annotation_track,
)
from gens.crud.sample_annotations import (
    create_sample_annotation_track,
    create_sample_annotations_for_track,
    delete_sample_annotations_for_track,
    get_sample_annotation_track,
)
from gens.crud.samples import create_sample
from gens.db.collections import (
    ANNOTATIONS_COLLECTION,
    SAMPLE_ANNOTATION_TRACKS_COLLECTION,
    SAMPLE_ANNOTATIONS_COLLECTION,
    SAMPLES_COLLECTION,
)
from gens.load.annotations import fmt_bed_to_annotation, parse_bed_file
from gens.load.meta import parse_meta_file
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleInfo, SampleSex
from gens.models.sample_annotation import SampleAnnotationRecord, SampleAnnotationTrack


def load_sample_data(
    sample_id: str,
    genome_build: GenomeBuild,
    baf: Path,
    coverage: Path,
    case_id: str,
    meta_files: list[Path],
    sample_type: str | None,
    sex: SampleSex | None,
) -> None:
    db = cli_db.get_cli_db([SAMPLES_COLLECTION])

    sample_obj = SampleInfo.model_validate(
        {
            "sample_id": sample_id,
            "case_id": case_id,
            "genome_build": genome_build,
            "baf_file": baf,
            "coverage_file": coverage,
            "sample_type": normalize_sample_type(sample_type) if sample_type else None,
            "sex": sex,
            "meta": [parse_meta_file(path) for path in meta_files],
        }
    )
    create_sample(db, sample_obj)


def load_sample_annotation_data(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild,
    file: Path,
    name: str,
) -> None:
    db = cli_db.get_cli_db(
        [SAMPLE_ANNOTATION_TRACKS_COLLECTION, SAMPLE_ANNOTATIONS_COLLECTION]
    )

    track_in_db = get_sample_annotation_track(
        genome_build=genome_build,
        db=db,
        sample_id=sample_id,
        case_id=case_id,
        name=name,
    )
    if track_in_db is None:
        track = SampleAnnotationTrack(
            sample_id=sample_id,
            case_id=case_id,
            name=name,
            description="",
            genome_build=genome_build,
        )
        track_id = create_sample_annotation_track(track, db)
    else:
        track_id = track_in_db.track_id

    bed_records = parse_bed_file(file)
    annotations = [
        SampleAnnotationRecord.model_validate(
            {
                **fmt_bed_to_annotation(rec, track_id, genome_build).model_dump(),
                "sample_id": sample_id,
                "case_id": case_id,
            }
        )
        for rec in bed_records
    ]

    if track_in_db is not None:
        delete_sample_annotations_for_track(track_id, db)

    create_sample_annotations_for_track(annotations, db)


def load_annotations_data(
    logger: Logger,
    file: Path,
    genome_build: GenomeBuild,
    is_tsv: bool,
    ignore_errors: bool,
) -> None:
    db = cli_db.get_cli_db([ANNOTATIONS_COLLECTION])

    files = file.glob("*") if file.is_dir() else [file]

    for annot_file in files:
        if annot_file.suffix not in [".bed", ".aed", ".tsv"]:
            continue
        logger.info("Processing %s", annot_file)

        track_result = upsert_annotation_track(db, annot_file, genome_build)
        file_format = annot_file.suffix[1:]

        try:
            parse_recs_res = parse_raw_records(
                file_format,
                is_tsv,
                annot_file,
                ignore_errors,
                track_result,
                genome_build,
            )
        except ValueError as err:
            click.secho(
                f"An error occured when creating loading annotation: {err}",
                fg="red",
            )
            raise click.Abort() from err

        if len(parse_recs_res.file_meta) > 0:
            logger.debug("Updating existing annotation track with metadata from file.")
            update_annotation_track(
                track_id=track_result.track_id,
                metadata=parse_recs_res.file_meta,
                db=db,
            )

        if len(parse_recs_res.records) == 0:
            delete_annotation_track(track_result.track_id, db)
            raise ValueError(
                "Something went wrong parsing the annotations file, no valid annotations found."
            )

        if track_result.track_in_db is not None:
            logger.info("Removing old entries from the database")
            if not delete_annotations_for_track(track_result.track_id, db):
                logger.info("No annotations were removed from the database")

        logger.info("Load annotations in the database")
        create_annotations_for_track(parse_recs_res.records, db)
        register_data_update(db, ANNOTATIONS_COLLECTION, annot_file.stem)
