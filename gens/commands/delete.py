import logging

import click
from flask import current_app as app
from flask.cli import with_appcontext
from pymongo import MongoClient

from gens.constants import GENOME_BUILDS
from gens.db import (SAMPLES_COLLECTION, create_index,
                     get_indexes, delete_sample)

LOG = logging.getLogger(__name__)
valid_genome_builds = [str(gb) for gb in GENOME_BUILDS]


@click.group()
def delete():
    """Delete information from Gens database"""


@delete.command()
@click.option("-i", "--sample-id", type=str, required=True, help="Sample id")
@click.option(
    "-b",
    "--genome-build",
    type=click.Choice(valid_genome_builds),
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
    db: MongoClient = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)
    delete_sample(
        db,
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
    )
    click.secho("Finished removing a sample from database ✔", fg="green")
