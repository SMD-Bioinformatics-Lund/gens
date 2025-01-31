from pydantic import BaseModel, ConfigDict

class RWModel(BaseModel):  # pylint: disable=too-few-public-methods
    """Base model for read/ write operations"""

    model_config = ConfigDict(
        allow_population_by_alias=True,
        populate_by_name=True,
        use_enum_values=True,
    )