"""CLI commands for removing entries from the database."""

import logging

import click
from flask import current_app as app
from flask.cli import with_appcontext

from gens.commands.util import ChoiceType
from gens.db import SAMPLES_COLLECTION, create_index, delete_sample, get_indexes
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)
valid_genome_builds = [str(gb.value) for gb in GenomeBuild]


@click.group()
def delete():
    """Delete information from Gens database"""


@delete.command()
@click.option("-i", "--sample-id", type=str, required=True, help="Sample id")
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
@with_appcontext
def sample(sample_id: str, genome_build: int, case_id: str):
    """Remove a sample from Gens database."""
    db = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)
    delete_sample(
        db[SAMPLES_COLLECTION],
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
    )
    click.secho("Finished removing a sample from database ✔", fg="green")
