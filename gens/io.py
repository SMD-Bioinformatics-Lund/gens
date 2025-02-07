"""Functions for loading and converting data."""

import itertools
import logging
import os
from enum import Enum
from fractions import Fraction
from pathlib import Path
from typing import Iterator

from flask import Response, abort, request
from pysam import TabixFile

from gens.models.genomic import Chromosome

from .cache import cache

BAF_SUFFIX = ".baf.bed.gz"
COV_SUFFIX = ".cov.bed.gz"
JSON_SUFFIX = ".overview.json.gz"


LOG = logging.getLogger(__name__)


class ZoomLevel(Enum):
    """Valid zoom or resolution levels."""

    A = "a"
    B = "b"
    C = "c"
    D = "d"
    O = "o"


def tabix_query(
    tbix: TabixFile,
    zoom_level: ZoomLevel,
    chrom: Chromosome,
    start: int | None = None,
    end: int | None = None,
    reduce: float | None = None,
) -> list[list[str]]:
    """
    Call tabix and generate an array of strings for each line it returns.
    """

    # Get data from bed file
    record_name = f"{zoom_level.value}_{chrom.value}"
    LOG.info(f"Query {tbix.filename}; {record_name} {start} {end}; reduce: {reduce}")
    try:
        records: Iterator[str] = tbix.fetch(record_name, start, end)
    except ValueError as err:
        LOG.error(err)
        records = []

    if reduce is not None:
        n_true, tot = Fraction(reduce).limit_denominator(1000).as_integer_ratio()
        cmap = itertools.cycle([1] * n_true + [0] * (tot - n_true))
        records: Iterator[str] = itertools.compress(records, cmap)

    return [r.split("\t") for r in records]
