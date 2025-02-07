"""Functions for handeling database connection."""

import logging

from flask import current_app as app
from pymongo import MongoClient

from ..config import settings

LOG = logging.getLogger(__name__)


def init_database_connection() -> None:
    """Initialize database connection and store variables to the two databases."""
    # verify that database was properly configured
    LOG.info("Initialize db connection")

    # connect to database
    app.config["SCOUT_DB"] = MongoClient(str(settings.scout_db)).get_database(
        name=settings.scout_dbname
    )
    app.config["GENS_DB"] = MongoClient(str(settings.gens_db)).get_database(
        name=settings.gens_dbname
    )
