"""Functions for handeling database connection."""
import logging

from flask import current_app as app
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from typing import Dict, Any

from .chrom_sizes import CHROMSIZES as ChromosomesCollectionName
from .samples import COLLECTION as SamplesCollectionName
from .annotation import ANNOTATIONS as AnnotationsCollectionName
from .annotation import TRANSCRIPTS as TranscripsCollectionName
from .annotation import UPDATES as UpdatesCollectionName
from ..config import settings

LOG = logging.getLogger(__name__)


class GensDb():
    """Container for database connection and collections."""

    def __init__(self, connection: str, db_name: str) -> None:
        """Constructor function."""
        client: MongoClient[Dict[str, Any]] = MongoClient(connection)
        self.db: Database[Any] = client.get_database(name=db_name)

        # setup collections
        self.chromosomes: Collection[Any] = self.db.get_collection(ChromosomesCollectionName)
        self.samples: Collection[Any] = self.db.get_collection(SamplesCollectionName)
        self.annotations: Collection[Any] = self.db.get_collection(AnnotationsCollectionName)
        self.transcripts: Collection[Any] = self.db.get_collection(TranscripsCollectionName)
        self.updates: Collection[Any] = self.db.get_collection(UpdatesCollectionName)

    def list_collection_names(self) -> list[str]:
        return self.db.list_collection_names()


def init_database_connection() -> None:
    """Initialize database connection and store variables to the two databases."""
    # verify that database was properly configured
    LOG.info("Initialize db connection")

    # connect to database
    app.config["SCOUT_DB"] = MongoClient(str(settings.scout_db)).get_database(name=settings.scout_dbname)
    app.config["GENS_DB"] = MongoClient(str(settings.gens_db)).get_database(name=settings.gens_dbname)
    app.config["GENS_TEST"] = GensDb(connection=str(settings.gens_db), db_name=settings.gens_dbname)