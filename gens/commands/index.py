"""Index collections in the database."""

import logging

import click
from flask import current_app
from flask.cli import with_appcontext
from pymongo import MongoClient

from gens.db import create_indexes, update_indexes

LOG = logging.getLogger(__name__)


@click.command("index", short_help="Index the database")
@click.option(
    "-y",
    "--yes",
    "build",
    is_flag=True,
)
@click.option("-u", "--update", help="Update the indexes", is_flag=True)
@with_appcontext
def index(build: bool, update: bool):
    """Create indexes for the database."""
    db: MongoClient = current_app.config["GENS_DB"]

    if update:
        n_updated = update_indexes(db)
        if n_updated == 0:
            click.secho("All indexes in place, nothing updated", fg="green")
        return

    # ask for confirmation to index if --yes is not set
    shall_index = False
    if not build:
        shall_index = click.confirm(
            "This will delete and rebuild all indexes(if not --update). Are you sure?"
        )

    if shall_index or build:
        create_indexes(db)
        click.secho("New indexes created", fg="green")
