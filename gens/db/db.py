"""Functions for handeling database connection."""

import logging
from typing import Any, Generator

from fastapi import HTTPException
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


def get_variant_software_adapter() -> Generator[InterpretationAdapter, None, None]:
    """Return the configured interpretation adapter."""

    if not settings.variant_db:
        raise HTTPException(
            status_code=503, detail="Variant software integration not configured"
        )

    if settings.variant_software_backend != "scout_mongo":
        raise HTTPException(
            status_code=503,
            detail=f"Unsupported variant software backend: {settings.variant_software_backend}"
        )

    client: MongoClient[Any] = MongoClient(str(settings.variant_db.connection))

    try:
        db = client.get_database(settings.variant_db.database)
        yield ScoutMongoAdapter(db)
    finally:
        client.close()
