"""Models related to sample information."""

from enum import StrEnum
from pathlib import Path

from pydantic import Field, computed_field, field_serializer
from pydantic.types import FilePath

from .base import CreatedAtModel, RWModel
from .genomic import GenomeBuild


def _get_tabix_path(path: Path, check: bool = False) -> Path:
    """Get path to a tabix index.

    The index is assumed to be in the same location as the file."""
    idx_path = path.with_suffix(path.suffix + ".tbi")
    if check and not idx_path.is_file():
        raise FileNotFoundError("Index file: {idx_path} was not found.")
    return idx_path


class ScatterDataType(StrEnum):
    COV = "coverage"
    BAF = "baf"


class ZoomLevel(StrEnum):
    """Valid zoom or resolution levels."""

    A = "a"
    B = "b"
    C = "c"
    D = "d"
    O = "o"


class SampleInfo(RWModel, CreatedAtModel):
    """Sample record stored in the database."""

    sample_id: str
    case_id: str
    genome_build: GenomeBuild
    baf_file: FilePath
    coverage_file: FilePath
    overview_file: FilePath | None

    @computed_field()  # type: ignore
    @property
    def baf_index(self) -> FilePath:
        """Get path to a tabix index."""

        return _get_tabix_path(self.baf_file, check=True)

    @computed_field()  # type: ignore
    @property
    def coverage_index(self) -> FilePath:
        """Get path to a tabix index."""

        return _get_tabix_path(self.coverage_file, check=True)

    @field_serializer("baf_file", "coverage_file", "overview_file")
    def serialize_path(self, path: Path) -> str:
        """Serialize a Path object as string"""

        return str(path)


class GenomeCoverage(RWModel):
    """Contains genome coverage info for scatter plots.
    
    The genome coverage is represented by paired list of position and value.
    """

    region: str | None
    position: list[int]
    value: list[float]
    zoom: ZoomLevel | None = None


class MultipleSamples(RWModel):  # pylint: disable=too-few-public-methods
    """Generic response model for multiple data records."""

    data: list[SampleInfo] = Field(..., description="List of records from the database.")
    records_total: int = Field(
        ...,
        alias="recordsTotal",
        description="Number of db records matching the query",
    )

    @property
    @computed_field(alias="recordsFiltered")
    def records_filtered(self) -> int:
        """
        Number of db returned records after narrowing the result.

        The result can be reduced with limit and skip operations etc.
        """
        return len(self.data)