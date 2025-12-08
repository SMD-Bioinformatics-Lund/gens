"""Index collections in the database."""

import logging
from os import getenv

import click

from gens.cli.util.util import db_setup
from gens.db.index import INDEXES, create_indexes, update_indexes

log_level = getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
LOG = logging.getLogger(__name__)


@click.command("index", short_help="Index the database")
@click.option(
    "-y",
    "--yes",
    "build",
    is_flag=True,
)
@click.option("-u", "--update", help="Update the indexes", is_flag=True)
def index(build: bool, update: bool) -> None:
    """Create indexes for the database."""
    db = db_setup(list(INDEXES.keys()))

    if update:
        n_updated = update_indexes(db)
        if n_updated == 0:
            click.secho("All indexes in place, nothing updated", fg="green")
        return

    # ask for confirmation to index if --yes is not set
    shall_index = False
    if not build:
        shall_index = click.confirm(
            "This will delete and rebuild all indexes. Are you sure?"
        )

    if shall_index or build:
        create_indexes(db)
        click.secho("New indexes created", fg="green")
