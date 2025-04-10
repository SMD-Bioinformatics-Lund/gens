"""Functions for loading and converting data."""

import itertools
import logging
from enum import Enum
from fractions import Fraction

from pymongo.collection import Collection
from pysam import TabixFile

from gens.models.genomic import Chromosome
from gens.models.sample import GenomeCoverage
from gens.db import (
    query_sample,
)
from gens.db.collections import (
    SAMPLES_COLLECTION,
)

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
    try:
        records = tbix.fetch(record_name, start, end)
    except ValueError as err:
        LOG.error(err)
        records = iter([])

    if reduce is not None:
        n_true, tot = Fraction(reduce).limit_denominator(1000).as_integer_ratio()
        cmap = itertools.cycle([1] * n_true + [0] * (tot - n_true))
        records = itertools.compress(records, cmap)

    return [r.split("\t") for r in records]


# FIXME: This is not ready for production
def dev_get_data(collection: Collection[dict], sample_id: str, case_id: str, region_str: str, cov_or_baf: str) -> GenomeCoverage:
    """Development entrypoint for getting the coverage of a region."""
    # TODO respond with 404 error if file is not found
    sample_obj = query_sample(collection, sample_id, case_id)

    if cov_or_baf == "cov":
        tabix_file = TabixFile(str(sample_obj.coverage_file))
    else:
        tabix_file = TabixFile(str(sample_obj.baf_file))

    region, _ = region_str.split(":")
    # start, end = [int(pos) for pos in range.split("-")]
    # FIXME: Grabbing the full chromosome during testing
    start = None
    end = None

    # Tabix
    record_name = f"a_{region}"

    try:
        records = tabix_file.fetch(record_name, start, end)
    except ValueError as err:
        LOG.error(err)
        records = iter([])

    def parse_raw_tabix(tabix_result: list[list[str]]) -> GenomeCoverage:
        zoom: str | None = None
        region: str | None = None
        values: list[float] = []
        positions: list[int] = []
        entry: list[str]

        if len(tabix_result) > 0:
            zoom, region = tabix_result[0][0].split("_")

        for entry in tabix_result:
            start = int(entry[1])
            end = int(entry[2])
            positions.append(round((start + end) / 2))
            values.append(float(entry[3]))
        return GenomeCoverage(region=region, zoom=zoom, position=positions, value=values)

    return parse_raw_tabix([r.split("\t") for r in records])