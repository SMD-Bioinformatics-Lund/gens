"""Gens default configuration."""

from enum import Enum

from pydantic import Field, HttpUrl, MongoDsn, model_validator
from pydantic_settings import BaseSettings
from pymongo.uri_parser import parse_uri


class AuthMethod(Enum):
    """Valid authentication options"""

    OAUTH = "oauth"
    SIMPLE = "simple"
    DISABLED = "disabled"


class Settings(BaseSettings):
    """Gens settings."""

    gens_db: MongoDsn = Field(
        MongoDsn("mongodb://mongodb:27017/gens"), description="Connection to Gens mongo database."
    )

    # For scout integration
    scout_db: MongoDsn = Field(
        MongoDsn("mongodb://mongodb:27017/scout"),
        description="Connection to Gens mongo database.",
    )
    scout_url: HttpUrl = Field(
        HttpUrl("http://localhost:8000"), description="Base URL to Scout."
    )
    gens_dbname: str = "gens"
    scout_dbname: str = "scout"

    # Annotation
    default_annotation_track: str | None = None

    # Authentication options
    authentication: AuthMethod = AuthMethod.DISABLED

    # Oauth options
    oauth_client_id: str | None = None
    oauth_secret: str | None = None
    oauth_discovery_url: HttpUrl | None = None

    @model_validator(mode="after")
    def check_oauth_opts(self):
        """Check that OAUTH options are set if authentication is oauth."""
        if self.authentication == AuthMethod.OAUTH:
            checks = [
                self.oauth_client_id is not None,
                self.oauth_secret is not None,
                self.oauth_discovery_url is not None,
            ]
            if not all(checks):
                raise ValueError(
                    "OAUTH require you to configure client_id, secret and discovery_url"
                )
        return self

    @model_validator(mode="after")
    def check_mongodb_connections(self):
        """
        Check if dbname is given in connection string and reassign if needed.

        DB name in connection string takes presidence over the variable <sw>_dbname.
        """
        # gens
        conn_info = parse_uri(str(self.gens_db))
        self.gens_dbname = (
            self.gens_dbname if conn_info["database"] is None else conn_info["database"]
        )

        # scout
        conn_info = parse_uri(str(self.scout_db))
        self.scout_dbname = (
            self.scout_dbname
            if conn_info["database"] is None
            else conn_info["database"]
        )

        return self


UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}

settings = Settings()
