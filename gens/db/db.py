"""Functions for handeling database connection."""
import logging
import os

from flask import current_app as app
from pymongo import MongoClient

from gens.exceptions import ConfigurationException

LOG = logging.getLogger(__name__)


def init_database_connection() -> None:
    """Initialize database connection and store variables to the two databases."""
    # verify that database was properly configured
    LOG.info("Initialize db connection")
    variables = {}
    for var_name in ["MONGODB_SCOUT_URI", "MONGODB_GENS_URI", "SCOUT_DBNAME", "GENS_DBNAME"]:
        if not any([var_name in os.environ, var_name in app.config]):
            raise ConfigurationException(
                f"Variable {var_name} not defined in either config or env variable"
            )
        variables[var_name] = os.environ.get(var_name, app.config.get(var_name))
    # connect to database
    scout_client = MongoClient(variables["MONGODB_SCOUT_URI"])
    gens_client = MongoClient(variables["MONGODB_GENS_URI"])
    # store db handlers in configuration
    app.config["SCOUT_DB"] = scout_client[variables["SCOUT_DBNAME"]]
    app.config["GENS_DB"] = gens_client[variables["GENS_DBNAME"]]
