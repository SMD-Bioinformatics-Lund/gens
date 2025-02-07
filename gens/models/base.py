"""Base datamodels that other inherits from."""
import datetime

from pydantic import BaseModel, ConfigDict, Field

from gens.utils import get_timestamp


class RWModel(BaseModel):  # pylint: disable=too-few-public-methods
    """Base model for read/ write operations"""

    model_config = ConfigDict(
        allow_population_by_alias=True,
        populate_by_name=True,
        use_enum_values=True,
    )


class CreatedAtModel(BaseModel):
    """Has a timestamp that default to current time in UTC."""

    created_at: datetime.datetime = Field(default_factory=get_timestamp)
