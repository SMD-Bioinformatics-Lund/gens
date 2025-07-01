"""Functions for loading and converting data."""

import gzip
import itertools
import json
import logging
from fractions import Fraction
from pathlib import Path
from typing import Any, Literal

import pyBigWig
from pymongo.collection import Collection
from pysam import TabixFile

from gens.crud.samples import get_sample
from gens.models.genomic import Chromosome, GenomicRegion
from gens.models.sample import GenomeCoverage, SampleInfo, ScatterDataType, ZoomLevel

BAF_SUFFIX = ".baf.bed.gz"
COV_SUFFIX = ".cov.bed.gz"
JSON_SUFFIX = ".overview.json.gz"


LOG = logging.getLogger(__name__)


def tabix_query(
    tbix: TabixFile,
    zoom_level: ZoomLevel,
    region: GenomicRegion,
    reduce: float | None = None,
) -> list[list[str]]:
    """
    Call tabix and generate an array of strings for each line it returns.
    """

    # Get data from bed file
    record_name = f"{zoom_level.value}_{region.chromosome}"
    try:
        records = tbix.fetch(record_name, region.start, region.end)
    except ValueError as err:
        LOG.error(err)
        records = iter([])

    if reduce is not None:
        n_true, tot = Fraction(reduce).limit_denominator(1000).as_integer_ratio()
        cmap = itertools.cycle([1] * n_true + [0] * (tot - n_true))
        records = itertools.compress(records, cmap)

    return [r.split("\t") for r in records]


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
    return GenomeCoverage(
        region=region,
        zoom=None if zoom is None else ZoomLevel(zoom),
        position=positions,
        value=values,
    )


def bigwig_query(
    bw: pyBigWig.pyBigWig,
    zoom_level: ZoomLevel,
    region: GenomicRegion,
    max_bins: int = 2000,
) -> GenomeCoverage:
    """Query coverage from a bigwig file"""

    chrom = (
        region.chromosome.value if hasattr(region.chromosome, "value") else str(region.chromosome)
    )

    region_start = region.start
    if not region_start:
        raise ValueError("No region start", region_start)

    bw_end = region.end or bw.chroms(chrom)
    span = bw_end - region_start + 1
    if span <= max_bins:
        values = bw.values(chrom, region_start - 1, bw_end)
        positions = list(range(region_start, bw_end + 1))
    else:
        values = bw.stats(chrom, region_start - 1, bw_end, nBins=max_bins)
        step = span / max_bins
        positions = [int(region_start + (i + 0.5) * step) for i in range(max_bins)]
    values = [0.0 if v is None else float(v) for v in values]
    return GenomeCoverage(region=chrom, zoom=zoom_level, position=positions, value=values)


def bigwig_overview(bw: pyBigWig.pyBigWig, max_bins: int = 2000) -> list[GenomeCoverage]:
    """Generate overview data from a bigwig file"""

    results: list[GenomeCoverage] = []
    chroms = bw.chroms()
    for chrom in Chromosome:
        if chrom.value not in chroms:
            continue
        chrom_len = chroms[chrom.value]
        bins = max_bins if chrom_len > max_bins else chrom_len
        values = bw.stats(chrom.value, 0, chrom_len, nBins=bins)
        step = chrom_len / bins
        positions = [int((i + 0.5) * step) for i in range(bins)]
        values = [0.0 if v is None else float(v) for v in values]
        results.append(
            GenomeCoverage(
                region=chrom.value,
                zoom=ZoomLevel.O,
                position=positions,
                value=values
            )
        )
    return results


def get_scatter_data(
    collection: Collection[dict[str, Any]],
    sample_id: str,
    case_id: str,
    region: GenomicRegion,
    data_type: ScatterDataType,
    zoom_level: Literal["o", "a", "b", "c", "d"],
) -> GenomeCoverage:  # type: ignore
    """Development entrypoint for getting the coverage of a region."""
    # TODO respond with 404 error if file is not found
    sample_obj = get_sample(collection, sample_id, case_id)

    if data_type == ScatterDataType.COV:
        file_path = sample_obj.coverage_file
    else:
        file_path = sample_obj.baf_file

    if file_path.suffix.lower in {".bw", ".bigwig"}:
        with pyBigWig.open(str(file_path)) as bw:
            return bigwig_query(bw, ZoomLevel(zoom_level), region)
    else:
        tabix_file = TabixFile(str(file_path))

    valid_zoom_levels = {"o", "a", "b", "c", "d"}
    if zoom_level not in valid_zoom_levels:
        raise ValueError(f"Unexpected zoom level: {zoom_level}, valid are: {valid_zoom_levels}")

    # Tabix
    record_name = f"{zoom_level}_{region.chromosome}"

    try:
        records = tabix_file.fetch(record_name, region.start, region.end)
    except ValueError as err:
        LOG.error(err)
        records = iter([])

    return parse_raw_tabix([r.split("\t") for r in records])


def get_overview_data(file: Path, data_type: ScatterDataType) -> list[GenomeCoverage]:
    """Read overview data from json file."""

    if not file.is_file():
        raise FileNotFoundError(f"Overview file {file} is not found")

    with gzip.open(file, "r") as json_gz:
        json_data = json.loads(json_gz.read().decode("utf-8"))

    results: list[GenomeCoverage] = []
    for chrom in json_data.keys():
        chrom_data = json_data[chrom]["cov" if data_type == ScatterDataType.COV else "baf"]

        results.append(
            GenomeCoverage(
                region=chrom,
                position=[pos for (pos, _) in chrom_data],
                value=[val for (_, val) in chrom_data],
            )
        )
    return results


def get_overview_from_tabix(sample: SampleInfo, data_type: ScatterDataType) -> list[GenomeCoverage]:
    """Generate overview data using the "o" resolution from bed files."""

    if data_type == ScatterDataType.COV:
        file_path = sample.coverage_file
    else:
        file_path = sample.coverage_file

    if file_path.suffix.lower() in {".bw", ".bigwig"}:
        with pyBigWig.open(str(file_path)) as bw:
            return bigwig_overview(bw)

    tabix_file = TabixFile(str(file_path))

    results: list[GenomeCoverage] = []
    for chrom in Chromosome:
        record_name = f"o_{chrom.value}"
        try:
            records = tabix_file.fetch(record_name)
        except ValueError as err:
            LOG.error(err)
            continue

        results.append(parse_raw_tabix([r.split("\t") for r in records]))

    return results
