"""Genomic"""

from gens.models.genomic import Chromosome, GenomicRegion
from gens.models.sample import ZoomLevel


def parse_region_str(region: str) -> GenomicRegion:
    """Region string to individual components and validate components."""
    try:
        # split string to its components
        raw_chromosome, pos_range = region.split(":")
        start, end = [
            int(pos) if pos != "None" else None for pos in pos_range.split("-")
        ]
        if start is None:
            raise ValueError("Start position must be defined.")
    except ValueError as err:
        raise ValueError(f"Invalid format of region '{region}'") from err
    # validate chromosome
    chromosome = Chromosome(raw_chromosome)

    return GenomicRegion.model_validate(
        {"chromosome": chromosome, "start": start, "end": end}
    )


def calc_zoom_level(start_pos: int, end_pos: int) -> ZoomLevel:
    """Calculate zoom level thresholds."""

    size = end_pos - start_pos + 1
    resolution = ZoomLevel.D
    if size > 15000000:
        resolution = ZoomLevel.A
    elif size > 1400000:
        resolution = ZoomLevel.B
    elif size > 200000:
        resolution = ZoomLevel.C
    return resolution
