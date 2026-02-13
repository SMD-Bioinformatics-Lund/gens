"""Shared database access seam for CLI commands."""

from typing import Any

from pymongo.database import Database

from gens.config import settings
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes


def get_cli_db(collections: list[str] | None = None) -> Database[Any]:
    """Get CLI DB connection and ensure indexes for requested collections."""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError(
            "No Gens database name provided in settings (settings.gens_db.database)"
        )

    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)

    if collections:
        for collection_name in collections:
            if len(get_indexes(db, collection_name)) == 0:
                create_index(db, collection_name)

    return db
