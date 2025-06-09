"""CLI commands for updating entries in the database."""

import logging

import click

from gens.cli.util import ChoiceType
from gens.config import settings
from gens.crud.samples import get_sample, update_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleType

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
