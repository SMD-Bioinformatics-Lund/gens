"""Gens command line interface."""

import click
# from flask.cli import FlaskGroup

from gens.__version__ import VERSION as version
# from gens.app import create_app

from .delete import delete as delete_command
from .update import update as update_command
from .index import index as index_command
from .load import load as load_command


@click.group()
@click.version_option(version)
def cli() -> None:
    """Management of Gens application"""


cli.add_command(index_command)
cli.add_command(load_command)
cli.add_command(delete_command)
cli.add_command(update_command)