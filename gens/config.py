"""Gens default configuration."""

import os
from enum import Enum
from pathlib import Path
from typing import Any, Tuple, Type

from pydantic import Field, HttpUrl, MongoDsn, model_validator
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    TomlConfigSettingsSource,
)
from pymongo.uri_parser import parse_uri

# read default config and user defined config
config_file = [Path(__file__).parent.joinpath("config.toml")]  # built in config file

CUSTOM_CONFIG_ENV_NAME = "CONFIG_FILE"
custom_config = os.getenv(CUSTOM_CONFIG_ENV_NAME)
if custom_config is not None:
    user_cnf = Path(custom_config)
    if user_cnf.exists():
        config_file.append(user_cnf)


class AuthMethod(Enum):
    """Valid authentication options"""

    OAUTH = "oauth"
    SIMPLE = "simple"
    DISABLED = "disabled"


class OauthConfig(BaseSettings):
    """Valid authentication options"""

    client_id: str
    secret: str
    discovery_url: HttpUrl


class MongoDbConfig(BaseSettings):
    """Configuration for MongoDB connection."""

    connection: MongoDsn = Field(..., description="Database connection string.")
    database: str | None = None


class Settings(BaseSettings):
    """Gens settings."""

    # For scout integration
    gens_db: MongoDbConfig
    scout_db: MongoDbConfig
    scout_url: HttpUrl = Field(..., description="Base URL to Scout.")
    gens_api_url: HttpUrl = Field(..., description="Gens API URL")
    interpretation_backend: str = Field(
        default="scout_mongo",
        description="Implementation used for interpretation software integration.",
    )

    main_sample_types: list[str] = Field(
        default_factory=lambda: ["proband", "tumor"],
        description="Sample types treated as main samples",
    )

    # Annotation
    default_annotation_track: str | None = None

    # Authentication options
    authentication: AuthMethod = AuthMethod.DISABLED

    # Oauth options
    oauth: OauthConfig | None = None

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        toml_file=config_file,
        env_nested_delimiter="__",
    )

    def get_dict(self) -> dict[str, Any]:
        return {
            "gens_db": self.gens_db.database,
            "scout_db": self.scout_db.database,
            "scout_url": self.scout_url,
            "gens_api_url": self.gens_api_url,
            "default_annotation_track": self.default_annotation_track,
            "main_sample_types": self.main_sample_types,
            "authentication": self.authentication.value,
            "oauth": self.oauth,
        }

    @model_validator(mode="after")
    def check_oauth_opts(self) -> "Settings":
        """Check that OAUTH options are set if authentication is oauth."""
        if self.authentication == AuthMethod.OAUTH:
            if not self.oauth is None:
                raise ValueError(
                    "OAUTH require you to configure client_id, secret and discovery_url"
                )
        return self

    @model_validator(mode="after")
    def check_mongodb_connections(self) -> "Settings":
        """
        Check if dbname is given in connection string and reassign if needed.

        DB name in connection string takes presidence over the variable <sw>_dbname.
        """
        # gens
        conn_info = parse_uri(str(self.gens_db.connection))
        self.gens_db.database = (
            self.gens_db.database if conn_info["database"] is None else conn_info["database"]
        )

        # scout
        conn_info = parse_uri(str(self.scout_db.connection))
        self.scout_db.database = (
            self.scout_db.database if conn_info["database"] is None else conn_info["database"]
        )

        return self

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        toml_settings = TomlConfigSettingsSource(settings_cls)
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
            toml_settings,
        )


UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}

settings = Settings()
