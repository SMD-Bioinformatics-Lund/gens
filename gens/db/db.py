"""Functions for handeling database connection."""

import logging
from typing import Any

import pymongo
from flask import current_app as app
from pydantic import MongoDsn
from pymongo.database import Database

from ..config import settings

LOG = logging.getLogger(__name__)


def init_database_connection() -> None:
    """Initialize database connection and store variables to the two databases."""
    # verify that database was properly configured
    LOG.info("Initialize db connection")

    # connect to database
    app.config["SCOUT_DB"] = pymongo.MongoClient(
        str(settings.scout_db.connection)
    ).get_database(name=settings.scout_db.database)
    app.config["GENS_DB"] = pymongo.MongoClient(
        str(settings.gens_db.connection)
    ).get_database(name=settings.gens_db.database)


def get_db_connection(mongo_uri: MongoDsn, db_name: str) -> Database[Any]:
    """Get database connection."""
    db: Database[Any] = pymongo.MongoClient(str(mongo_uri)).get_database(name=db_name)
    return db


class GensDb:
    """Database connection."""

    def __init__(self, uri: MongoDsn):
        """Setup database connection instance."""

        self._client = pymongo.MongoClient(str(uri))


def get_db() -> Generator[Database[Any], None, None]:
    """Connect to a database."""
    try:
        client = pymongo.MongoClient(str(settings.gens_db.connection))
        yield client.get_database(settings.gens_db.database)
    finally:
        client.close()