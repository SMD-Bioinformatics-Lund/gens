"""Base datamodels that other inherits from."""

import datetime
from typing import Annotated, Any, Callable

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, EmailStr, computed_field

from gens.utils import get_timestamp
from pydantic_core import core_schema


class RWModel(BaseModel):  # pylint: disable=too-few-public-methods
    """Base model for read/ write operations"""

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
    )


class CreatedAtModel(BaseModel):
    """Has a timestamp that default to current time in UTC."""

    created_at: datetime.datetime = Field(default_factory=get_timestamp)


class ModifiedAtModel(BaseModel):
    """Has a timestamp that default to current time in UTC."""

    modified_at: datetime.datetime = Field(default_factory=get_timestamp)


class _ObjectIdPydanticAnnotation:
    # Based on https://docs.pydantic.dev/latest/usage/types/custom/#handling-third-party-types.

    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: Callable[[Any], core_schema.CoreSchema],
    ) -> core_schema.CoreSchema:
        def validate_from_str(input_value: str) -> ObjectId:
            return ObjectId(input_value)

        return core_schema.union_schema(
            [
                # check if it's an instance first before doing any further work
                core_schema.is_instance_schema(ObjectId),
                core_schema.no_info_plain_validator_function(validate_from_str),
            ],
            serialization=core_schema.to_string_ser_schema(),
        )

PydanticObjectId = Annotated[
    ObjectId, _ObjectIdPydanticAnnotation
]

class User(CreatedAtModel, ModifiedAtModel):
    """Stores user information."""

    name: str
    email: EmailStr
    roles: list[str]