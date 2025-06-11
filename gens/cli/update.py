"""CLI commands for updating entries in the database."""

import logging
from pathlib import Path

import click

from gens.cli.util import ChoiceType
from gens.config import settings
from gens.crud.sample_annotations import create_sample_annotation_track, create_sample_annotations_for_track, delete_sample_annotations_for_track, get_sample_annotation_track
from gens.crud.samples import get_sample, update_sample
from gens.db.collections import SAMPLE_ANNOTATION_TRACKS_COLLECTION, SAMPLE_ANNOTATIONS_COLLECTION, SAMPLES_COLLECTION
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes
from gens.load.annotations import fmt_bed_to_annotation, parse_bed_file
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleType
from gens.models.sample_annotation import SampleAnnotationRecord, SampleAnnotationTrack

LOG = logging.getLogger(__name__)


@click.group()
def update() -> None:
    """Update information in Gens database"""


@update.command()
@click.option("-i", "--sample-id", required=True, help="Sample id")
@click.option(
    "-n",
    "--case-id",
    required=True,
    help="Id of case",
)
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
@click.option(
    "-t",
    "--sample-type",
    type=ChoiceType(SampleType),
    required=True,
    help="New sample type",
)
def sample(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild,
    sample_type: SampleType,
) -> None:
    """Update sample type for a sample."""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError(
            "No Gens database name provided in settings (settings.gens_db.database)"
        )
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)

    sample_obj = get_sample(db[SAMPLES_COLLECTION], sample_id=sample_id, case_id=case_id)
    sample_obj.sample_type = sample_type
    update_sample(db, sample_obj)
    click.secho("Finished updating sample ✔", fg="green")


@update.command("sample-annotations")
@click.option("--sample-id", required=True, help="Sample ID")
@click.option("--case-id", required=True, help="Case ID")
@click.option("--genome-build", type=ChoiceType(GenomeBuild), required=True, help="Genome build")
@click.option("--file", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--name", required=True, help="Name of the annotation track")
def update_sample_annotation(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild,
    file: Path,
    name: str,
) -> None:
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError("No Gens database provided in settings (settings.gens_db.database)")
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    if len(get_indexes(db, SAMPLE_ANNOTATION_TRACKS_COLLECTION)) == 0:
        create_index(db, SAMPLE_ANNOTATION_TRACKS_COLLECTION)
    if len(get_indexes(db, SAMPLE_ANNOTATIONS_COLLECTION)) == 0:
        create_index(db, SAMPLE_ANNOTATIONS_COLLECTION)
    
    track_in_db = get_sample_annotation_track(
        genome_build=genome_build,
        db=db,
        sample_id=sample_id,
        case_id=case_id,
        name=name
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
                "case_id": case_id
            }
            ) for rec in bed_records
    ]

    if track_in_db is not None:
        delete_sample_annotations_for_track(track_id, db)
    
    create_sample_annotations_for_track(annotations, db)
    click.secho("Finished updating sample annotations ✔", fg="green")

