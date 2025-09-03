"""Utility functions and classes for click commands."""

import click
from pymongo.database import Database
from gens.config import settings
from gens.constants import SAMPLE_TYPE_ALIASES
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes


def normalize_sample_type(sample_type: str) -> str:
    return SAMPLE_TYPE_ALIASES.get(sample_type.lower(), sample_type)


class ChoiceType(click.Choice):
    """Custom input type for click that returns genome build enum."""

    name = "genome build"

    def __init__(self, enum):
        super().__init__(list(map(str, enum)))
        self.enum = enum

    def convert(self, value: str, param, ctx):
        """Convert str to genome build"""

        value = super().convert(value, param, ctx)
        return next(v for v in self.enum if str(v) == value)



def db_setup(collections: list[str]) -> Database:
    gens_db_name = settings.gens_db.database

    if gens_db_name is None:
        raise ValueError("No Gens database name provided in settings (settings.gens_db.database)")

    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)

    for coll in collections:
        if len(get_indexes(db, coll)) == 0:
            create_index(db, coll)

    return db

