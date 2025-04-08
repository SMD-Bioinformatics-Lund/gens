"""Shared support functions and data."""

from enum import StrEnum


class ApiTags(StrEnum):
    SAMPLE = "sample"
    ANNOT = "annotation"
    AUTH = "authentication"


class ScatterDataType(StrEnum):
    COV = "coverage"
    BAF = "baf"
