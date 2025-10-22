"""Models for sample specific annotation tracks"""

from typing import Any

from pydantic import Field

from gens.models.annotation import AnnotationRecord
from gens.models.base import CreatedAtModel, ModifiedAtModel, PydanticObjectId, RWModel
from gens.models.genomic import GenomeBuild


class SampleAnnotationRecord(AnnotationRecord):
    sample_id: str
    case_id: str


class SampleAnnotationTrack(RWModel, CreatedAtModel, ModifiedAtModel):

    sample_id: str
    case_id: str
    name: str
    description: str | None = None
    genome_build: GenomeBuild
    metadata: list[dict[str, Any]] = []


# FIXME: Dig into this. Why is this one separate from the one above?
class SampleAnnotationTrackInDb(SampleAnnotationTrack):
    track_id: PydanticObjectId = Field(alias="_id")
