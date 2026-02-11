"""Gens default configuration."""

import json
import os
from enum import Enum
from pathlib import Path
from typing import Any, Literal, Tuple, Type

from pydantic import AnyUrl, BaseModel, Field, HttpUrl, MongoDsn, model_validator
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

CONFIG_PATHS = [path.resolve() for path in config_file if path.exists()]
CONFIG_DIRS = [path.parent for path in CONFIG_PATHS]


class AuthMethod(Enum):
    """Valid authentication options"""

    OAUTH = "oauth"
    LDAP = "ldap"
    DISABLED = "disabled"


class AuthUserDb(Enum):
    """Valid user databases for authentication."""

    GENS = "gens"
    VARIANT = "variant"


class OauthConfig(BaseSettings):
    """Valid authentication options"""

    client_id: str
    secret: str
    discovery_url: HttpUrl


class LdapConfig(BaseSettings):
    """Configuration for LDAP direct bind authentication"""

    server: AnyUrl = Field(..., description="LDAP server URL, e.g. ldap://ldap")
    bind_user_template: str = Field(
        default="{username}",
        description=(
            "Template user to build the bind DN"
            "The placeholder '{username}' will be replaced with the provided username."
        ),
    )


class MongoDbConfig(BaseSettings):
    """Configuration for MongoDB connection."""

    connection: MongoDsn = Field(..., description="Database connection string.")
    database: str | None = None


class WarningIgnore(BaseModel):
    """Conditions for ignoring meta warning thresholds."""

    sex: Literal["M", "F"] | None = None
    column: str | None = None
    chromosome: str | None = None
    row: str | None = None


class WarningThreshold(BaseModel):
    """Configuration for meta warning thresholds."""

    column: str
    ignore_when: WarningIgnore | list[WarningIgnore] | None = None
    kind: Literal[
        "estimated_chromosome_count_deviate",
        "threshold_above",
        "threshold_below",
        "threshold_deviate",
    ] = "threshold_above"
    size: float | None = None
    max_deviation: float | None = None
    message: str = ""


class Settings(BaseSettings):
    """Gens settings."""

    # For scout integration
    gens_db: MongoDbConfig
    variant_db: MongoDbConfig | None = None
    variant_url: HttpUrl | None = Field(
        default=None, description="Base URL to interpretation software."
    )
    gens_api_url: HttpUrl = Field(..., description="Gens API URL")
    variant_software_backend: str = Field(
        default="scout_mongo",
        description="Implementation used for interpretation software integration.",
    )

    main_sample_types: list[str] = Field(
        default_factory=lambda: ["proband", "tumor"],
        description="Sample types treated as main samples",
    )

    # Authentication options
    authentication: AuthMethod = AuthMethod.DISABLED
    auth_user_db: AuthUserDb = Field(
        default=AuthUserDb.GENS,
        description="Database to use for authentication user lookups.",
    )
    auth_user_collection: str = Field(
        default="user",
        description="Collection name used for authentication user lookups.",
    )

    # Oauth options
    oauth: OauthConfig | None = None

    # LDAP options
    ldap: LdapConfig | None = None

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        toml_file=config_file,
        env_nested_delimiter="__",
    )

    default_profile_paths: dict[str, Path] = Field(
        default_factory=dict,
        description="Mapping between profile types and default profile definitions. Values are paths to JSON files relative to the config file.",
    )

    warning_thresholds: list[WarningThreshold] = Field(
        default_factory=lambda: [],
        description="Rules for highlighting meta table warnings.",
    )

    def get_dict(self) -> dict[str, Any]:
        return {
            "gens_db": self.gens_db.database,
            "variant_db": self.variant_db.database if self.variant_db else None,
            "scout_url": self.variant_url,
            "gens_api_url": self.gens_api_url,
            "main_sample_types": self.main_sample_types,
            "authentication": self.authentication.value,
            "auth_user_db": self.auth_user_db.value,
            "auth_user_collection": self.auth_user_collection,
            "oauth": self.oauth,
            "ldap": self.ldap,
            "default_profiles": self.default_profiles,
            "warning_thresholds": [
                threshold.model_dump() for threshold in self.warning_thresholds
            ],
        }

    @model_validator(mode="after")
    def check_auth_opts(self) -> "Settings":
        """Check that OAUTH or LDAP options are set if authentication is assigned."""
        if self.authentication == AuthMethod.OAUTH and self.oauth is None:
            raise ValueError(
                "OAUTH require you to configure client_id, secret and discovery_url"
            )
        if self.authentication == AuthMethod.LDAP and self.ldap is None:
            raise ValueError(
                "LDAP authentication requires you to configure server and bind_user_template"
            )
        if self.auth_user_db == AuthUserDb.VARIANT and self.variant_db is None:
            raise ValueError(
                "auth_user_db='variant' requires variant_db to be configured"
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
            self.gens_db.database
            if conn_info["database"] is None
            else conn_info["database"]
        )

        # scout
        if self.variant_db:
            conn_info = parse_uri(str(self.variant_db.connection))
            self.variant_db.database = (
                self.variant_db.database
                if conn_info["database"] is None
                else conn_info["database"]
            )

        return self

    @property
    def default_profiles(self) -> dict[str, Any] | list | None:
        """
        Loaded JSON from default_profile_paths
        """

        if self.default_profile_paths is None:
            return None

        loaded_profiles = {}
        for key, json_path in self.default_profile_paths.items():
            resolved = _resolve_profile_path(json_path)
            loaded_profile = _load_profile(resolved)

            if isinstance(loaded_profile, dict):
                loaded_profile["fileName"] = resolved.name

            loaded_profiles[key] = loaded_profile

        return loaded_profiles

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


def _resolve_profile_path(profile_path: Path) -> Path:
    if profile_path.is_absolute():
        return profile_path

    for config_dir in CONFIG_DIRS:
        candidate = config_dir.joinpath(profile_path)
        if candidate.exists():
            return candidate

    return profile_path


def _load_profile(profile_path: Path) -> dict[str, Any]:
    if not profile_path.exists():
        raise ValueError(f"Default profile file not found: {profile_path}")

    with profile_path.open("r", encoding="utf-8") as profile_file:
        try:
            return json.load(profile_file)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"Default profile file {profile_path} contains invalid JSON"
            ) from error


UI_COLORS = {
    "variants": {"del": "#C84630", "dup": "#4C6D94"},
    "transcripts": {"strand_pos": "#aa4362", "strand_neg": "#43AA8B"},
}

settings = Settings()
