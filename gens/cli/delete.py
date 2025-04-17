"""CLI commands for removing entries from the database."""

import logging

import click

from gens.cli.util import ChoiceType
from gens.config import settings
from gens.crud.samples import delete_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)
valid_genome_builds = [str(gb.value) for gb in GenomeBuild]


@click.group()
def delete() -> None:
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
    delete_sample(
        db=db,
        sample_id=sample_id,
        case_id=case_id,
        genome_build=GenomeBuild(genome_build),
    )
    click.secho("Finished removing a sample from database ✔", fg="green")
