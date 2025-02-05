"""Models related to sample information."""

from pydantic.types import FilePath

from .base import RWModel, CreatedAtModel
from .genomic import GenomeBuild

class SampleInfo(RWModel, CreatedAtModel):
    """Sample record stored in the database."""

    sample_id: str
    case_id: str
    genome_build: GenomeBuild
    baf_file: FilePath
    coverage_file: FilePath
    overview_file: FilePath