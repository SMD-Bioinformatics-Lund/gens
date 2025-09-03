"""Functions for handeling database connection."""

import logging
from typing import Any, Generator

from flask import Flask
from pydantic import MongoDsn
from pymongo import MongoClient
from pymongo.database import Database

from gens.adapters.base import InterpretationAdapter
from gens.adapters.scout import ScoutMongoAdapter
from gens.config import settings

LOG = logging.getLogger(__name__)


def init_database_connection(app: Flask) -> None:
    """Initialize database connection and store variables to the two databases."""

    LOG.info("Initialize db connection")

    # FIXME: Generalize
    interpretation_client: MongoClient = MongoClient(str(settings.variant_db.connection))
    app.config["INTERPRETATION_ADAPTER"] = ScoutMongoAdapter(
        interpretation_client.get_database(name=settings.variant_db.database)
    )

    app.config["GENS_DB"] = MongoClient(str(settings.gens_db.connection)).get_database(
        name=settings.gens_db.database
    )


def get_db_connection(mongo_uri: MongoDsn, db_name: str) -> Database[Any]:
    """Get database connection."""
    db: Database[Any] = MongoClient(str(mongo_uri)).get_database(name=db_name)
    return db


def get_gens_db() -> Generator[Database[Any], None, None]:
    """Connect to the Gens database."""
    client: MongoClient[Any] = MongoClient(str(settings.gens_db.connection))
    try:
        yield client.get_database(settings.gens_db.database)
    finally:
        client.close()


# FIXME: Think through how and why this is needed
# Seems required to setup the deps for the FastAPI usage
def get_variant_software_adapter() -> Generator[InterpretationAdapter, None, None]:
    """Return the configured interpretation adapter."""

    if settings.interpretation_backend != "scout_mongo":
        raise ValueError(f"Unsupported interpretation backend: {settings.interpretation_backend}")

    client: MongoClient[Any] = MongoClient(str(settings.variant_db.connection))

    try:
        db = client.get_database(settings.variant_db.database)
        # FIXME: Why yield here
        yield ScoutMongoAdapter(db)
    finally:
        client.close()
