"""Models related to sample information."""

from pathlib import Path

from pydantic import computed_field, field_serializer
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


class SampleInfo(RWModel, CreatedAtModel):
    """Sample record stored in the database."""

    sample_id: str
    case_id: str
    genome_build: GenomeBuild
    baf_file: FilePath
    coverage_file: FilePath
    overview_file: FilePath

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

    # @staticmethod
    # def parse(mongo_dict: dict) -> 'SampleInfo':
    #     sample_id = mongo_dict['sample_id']
    #     case_id = mongo_dict['case_id']
    #     genome_build = mongo_dict['genome_build']
    #     baf_file = mongo_dict['baf_file']
    #     coverage_file = mongo_dict['coverage_dict']
    #     overview_file = mongo_dict['overview_file']
    #     return SampleInfo(sample_id, case_id, genome_build, baf_file, coerage_file, overview_file)
