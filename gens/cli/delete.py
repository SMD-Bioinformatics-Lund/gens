"""CLI commands for removing entries from the database."""

import logging
from os import getenv

import click

from gens.cli.util.util import ChoiceType, db_setup
from gens.config import settings
from gens.crud.annotations import (
    delete_annotation_track,
    delete_annotations_for_track,
    get_annotation_track,
)
from gens.crud.sample_annotations import (
    delete_sample_annotation_track,
    delete_sample_annotations_for_track,
    get_sample_annotation_track,
)
from gens.crud.samples import delete_sample, get_sample_ids_for_case_and_build
from gens.db.collections import (
    ANNOTATION_TRACKS_COLLECTION,
    ANNOTATIONS_COLLECTION,
    SAMPLE_ANNOTATION_TRACKS_COLLECTION,
    SAMPLE_ANNOTATIONS_COLLECTION,
    SAMPLES_COLLECTION,
)
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes
from gens.models.genomic import GenomeBuild

log_level = getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
LOG = logging.getLogger(__name__)

valid_genome_builds = [str(gb.value) for gb in GenomeBuild]


@click.group()
def delete() -> None:
    """Delete information from Gens database"""


@delete.command()
@click.option("-i", "--sample-id", type=str, help="Sample id")
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
@click.option(
    "-n",
    "--case-id",
    required=True,
    help="Id of case",
)
def sample(sample_id: str, genome_build: int, case_id: str) -> None:
    """Remove a sample from Gens database."""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError(
            "No Gens database name provided in settings (settings.gens_db.database)"
        )
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)

    samples_c = db.get_collection(SAMPLES_COLLECTION)
    samples_to_delete = (
        [sample_id]
        if sample_id is not None
        else get_sample_ids_for_case_and_build(
            samples_c=samples_c,
            case_id=case_id,
            genome_build=GenomeBuild(genome_build),
        )
    )

    if not samples_to_delete:
        raise click.ClickException(f"No samples found for case_id '{case_id}' and genome build '{genome_build}'")

    if sample_id is None:
        click.echo("The following samples will be removed:")
        for sample in samples_to_delete:
            click.echo(f" - {sample}")
        if not click.confirm("Proceed with deletion?", default=False):
            click.echo("Aborted.")
            return

    for sample in samples_to_delete:
        delete_sample(
            db=db,
            sample_id=sample_id,
            case_id=case_id,
            genome_build=GenomeBuild(genome_build),
        )
    click.secho(f"Finished removing {len(samples_to_delete)} samples from database ✔", fg="green")


@delete.command("sample-annotation")
@click.option("--sample-id", required=True, help="Sample ID")
@click.option("--case-id", required=True, help="Case ID")
@click.option(
    "--genome-build", type=ChoiceType(GenomeBuild), required=True, help="Genome build"
)
@click.option("--name", required=True, help="Name of the annotation track")
def sample_annotation(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild,
    name: str,
) -> None:
    """Remove a sample annotation track from Gens database."""

    db = db_setup([SAMPLE_ANNOTATION_TRACKS_COLLECTION, SAMPLE_ANNOTATIONS_COLLECTION])

    track = get_sample_annotation_track(
        genome_build=genome_build,
        db=db,
        sample_id=sample_id,
        case_id=case_id,
        name=name,
    )

    if track is None:
        raise click.ClickException("No matching sample annotation track found")

    delete_sample_annotations_for_track(track.track_id, db)
    delete_sample_annotation_track(track.track_id, db)
    click.secho("Finished removing sample annotation track ✔", fg="green")


@delete.command("annotation")
@click.option(
    "--genome-build", type=ChoiceType(GenomeBuild), required=True, help="Genome build"
)
@click.option("--name", required=True, help="Name of the annotation track")
def annotation(genome_build: GenomeBuild, name: str) -> None:
    """Remove an annotation track from Gens database."""

    db = db_setup([ANNOTATION_TRACKS_COLLECTION, ANNOTATIONS_COLLECTION])

    track = get_annotation_track(genome_build=genome_build, db=db, name=name)

    if track is None:
        raise click.ClickException("No matching annotation track found")

    delete_annotations_for_track(track.track_id, db)
    delete_annotation_track(track.track_id, db)
    click.secho("Finished removing annotation track ✔", fg="green")
