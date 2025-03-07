"""Functions for getting information from Gens views."""

import logging
import re
from collections import namedtuple
from typing import Any

from flask import current_app as app
from flask import request
from pysam import TabixFile
from pymongo.database import Database

from .cache import cache
from .db import get_chromosome_size
from .exceptions import RegionParserException
from .io import ZoomLevel, tabix_query
from .models.genomic import Chromosome, GenomeBuild, GenomicRegion

LOG = logging.getLogger(__name__)


# FIXME: Replace these with Pydantic classes?
GRAPH = namedtuple("GRAPH", ("baf_ampl", "log2_ampl", "baf_ypos", "log2_ypos"))
REGION = namedtuple("REGION", ("res", "chrom", "start_pos", "end_pos"))

REQUEST = namedtuple(
    "REQUEST",
    (
        "region",
        "x_pos",
        "y_pos",
        "plot_height",
        "top_bottom_padding",
        "baf_y_start",
        "baf_y_end",
        "log2_y_start",
        "log2_y_end",
        "genome_build",
        "reduce_data",
    ),
)


# FIXME: Refactor me
@cache.memoize(0)
def convert_data(
    graph: GRAPH,
    req: REQUEST,
    log2_list: list[list[str]],
    baf_list: list[list[str]],
    x_pos: int,
    new_start_pos: int,
    new_x_ampl: float,
    data_type: str = "bed",
) -> tuple[list[Any], list[Any]]:
    """
    Converts data for Log2 ratio and BAF to screen coordinates
    Also caps the data
    """

    if data_type == "json":
        chrom_pos_idx, value_idx = 0, 1
    elif data_type == "bed":
        chrom_pos_idx, value_idx = 1, 3
    else:
        raise ValueError(f"Data type {data_type} not supported. Use bed or json!")

    #  Normalize and calculate the Log2 ratio
    log2_records = []
    for record in log2_list:
        # Cap values to end points
        ypos = float(record[value_idx])
        ypos = req.log2_y_start + 0.2 if ypos > req.log2_y_start else ypos
        ypos = req.log2_y_end - 0.2 if ypos < req.log2_y_end else ypos

        # Convert to screen coordinates
        xpos = (
            int(x_pos + new_x_ampl * (float(record[chrom_pos_idx]) - new_start_pos)),
        )
        log2_records.extend([xpos, int(graph.log2_ypos - graph.log2_ampl * ypos)])

    # Gather the BAF records
    baf_records = []
    for record in baf_list:
        # Cap values to end points
        ypos = float(record[value_idx])
        ypos = req.baf_y_start + 0.2 if ypos > req.baf_y_start else ypos
        ypos = req.baf_y_end - 0.2 if ypos < req.baf_y_end else ypos

        # Convert to screen coordinates
        xpos = (
            int(x_pos + new_x_ampl * (float(record[chrom_pos_idx]) - new_start_pos)),
        )
        baf_records.extend([xpos, int(graph.baf_ypos - graph.baf_ampl * ypos)])

    return log2_records, baf_records


# FIXME: This one does not seem to be used at all?
def find_chrom_at_pos(
    chrom_dims: dict[str, dict[str, int]],
    height: int,
    current_x: int,
    current_y: int,
    margin: int,
) -> str | None:
    """
    Returns which chromosome the current position belongs to in the overview graph
    """
    current_chrom = None

    for chrom in Chromosome:
        x_pos = chrom_dims[chrom.value]["x_pos"]
        y_pos = chrom_dims[chrom.value]["y_pos"]
        width = chrom_dims[chrom.value]["width"]
        if x_pos + margin <= current_x <= (
            x_pos + width
        ) and y_pos + margin <= current_y <= (y_pos + height):
            current_chrom = chrom.value
            break

    return current_chrom


ChromDims = dict[Chromosome, dict[str, float | int]]


def overview_chrom_dimensions(
    x_pos: float, y_pos: float, plot_width: float, genome_build: GenomeBuild
) -> ChromDims:
    """
    Calculates the position for all chromosome graphs in the overview canvas
    """
    db: Database = app.config["GENS_DB"]
    chrom_dims = {}
    for chrom in Chromosome:
        chrom_data = get_chromosome_size(db, chrom, genome_build)
        chrom_width = plot_width * chrom_data.scale
        chrom_dims[chrom] = {
            "x_pos": x_pos,
            "y_pos": y_pos,
            "width": chrom_width,
            "size": chrom_data.size,
        }
        x_pos += chrom_width
    return chrom_dims


@cache.memoize(50)
def parse_region_str(
    region: str, genome_build: GenomeBuild
) -> tuple[ZoomLevel, GenomicRegion] | None:
    """
    Parses a region string
    """
    name_search = None
    start: int | None = None
    end: int | None = None
    chrom: Chromosome | None = None
    try:
        # Split region in standard format chrom:start-stop
        if ":" in region:
            chrom_str, pos_range = region.split(":")
            start, end = [
                int(pos) if pos != "None" else None for pos in pos_range.split("-")
            ]
            chrom_str = chrom_str.replace("chr", "")
            chrom = Chromosome(chrom_str.upper())
        else:
            # Not in standard format, query in form of full chromsome
            # or gene
            name_search = region
    except ValueError:
        LOG.exception("Wrong region formatting for region: %s", region)
        return None

    db: Database = app.config["GENS_DB"]

    if name_search is not None:
        # Query is for a full range chromosome
        if name_search.upper() in [ch.value for ch in Chromosome]:
            start = 0
            end = None
            chrom = Chromosome(name_search.upper())
        else:
            # Lookup queried gene
            collection = db["transcripts" + str(genome_build)]
            start_query = collection.find_one(
                {
                    "gene_name": re.compile(
                        "^" + re.escape(name_search) + "$", re.IGNORECASE
                    )
                },
                sort=[("start", 1)],
            )
            end_query = collection.find_one(
                {
                    "gene_name": re.compile(
                        "^" + re.escape(name_search) + "$", re.IGNORECASE
                    )
                },
                sort=[("end", -1)],
            )
            if start_query is not None and end_query is not None:
                chrom = Chromosome(start_query["chrom"])
                start = start_query["start"]
                end = end_query["end"]
            else:
                LOG.warning("Did not find range for gene name")
                return None

    if chrom is None:
        raise ValueError(f"Expected variable chrom, found: {chrom}")
    if start is None:
        raise ValueError(f"Expected variable start, found: {start}")

    chrom_data = get_chromosome_size(db, chrom, genome_build)
    # Set end position if it is not set
    if end == "None" or end is None:
        end = chrom_data.size

    start = int(start)
    size = end - start

    if size <= 0:
        LOG.error("Invalid input span")
        return None

    # Cap end to maximum range value for given chromosome
    if end > chrom_data.size:
        start = max(0, start - (end - chrom_data.size))
        end = chrom_data.size

    resolution = ZoomLevel.D
    if size > 15000000:
        resolution = ZoomLevel.A
    elif size > 1400000:
        resolution = ZoomLevel.B
    elif size > 200000:
        resolution = ZoomLevel.C

    return resolution, GenomicRegion(region=f"{chrom.value}:{start}-{end}")


def set_graph_values(req: Any) -> GRAPH:
    """
    Returns graph-specific values as named tuple
    """
    log2_height = abs(req.log2_y_end - req.log2_y_start)
    baf_height = abs(req.baf_y_end - req.baf_y_start)
    return GRAPH(
        (req.plot_height - 2 * req.top_bottom_padding) / baf_height,
        (req.plot_height - req.top_bottom_padding * 2) / log2_height,
        req.y_pos + req.plot_height - req.top_bottom_padding,
        req.y_pos + 1.5 * req.plot_height,
    )


def set_region_values(
    zoom_level: ZoomLevel, region: GenomicRegion, x_ampl: float
) -> tuple[REGION, int, int, float, float]:
    """
    Sets region values
    """
    extra_plot_width = float(request.args.get("extra_plot_width", 0))
    start_pos = region.start
    end_pos = region.end

    if start_pos is None or end_pos is None:
        raise ValueError(
            f"Expected start_pos and end_pos, found: {start_pos} {end_pos}"
        )

    # Set resolution for overview graph
    if request.args.get("overview", False):
        zoom_level = ZoomLevel.O

    # Move negative start and end position to positive values
    if start_pos != "None" and int(start_pos) < 0:
        end_pos += start_pos
        start_pos = 0

    # Add extra data to edges
    new_start_pos = int(start_pos - extra_plot_width * ((end_pos - start_pos) / x_ampl))
    new_end_pos = int(end_pos + extra_plot_width * ((end_pos - start_pos) / x_ampl))

    # X ampl contains the total width to plot x data on
    x_ampl = (x_ampl + 2 * extra_plot_width) / (new_end_pos - new_start_pos)
    return (
        REGION(zoom_level, region.chromosome, start_pos, end_pos),
        new_start_pos,
        new_end_pos,
        x_ampl,
        extra_plot_width,
    )


def get_cov(
    req: REQUEST,
    x_ampl: float,
    json_data: dict[str, Any] | None = None,
    cov_fh: TabixFile | None = None,
    baf_fh: TabixFile | None = None,
) -> tuple[REGION, int, int, list[Any], list[Any]]:
    """Get Log2 ratio and BAF values for chromosome with screen coordinates."""
    db: Database = app.config["GENS_DB"]
    graph = set_graph_values(req)
    # parse region
    parse_results = parse_region_str(req.region, req.genome_build)
    if not parse_results:
        raise ValueError("Parsing in parse_region_str failed")

    zoom_level, region = parse_results
    if not region:
        raise RegionParserException("No parsed region")

    # Set values that are needed to convert coordinates to screen coordinates
    (
        region,
        new_start_pos,
        new_end_pos,
        new_x_ampl,
        extra_plot_width,
    ) = set_region_values(zoom_level, region, x_ampl)

    if json_data:
        data_type = "json"
        baf_list = json_data[region.chrom.value]["baf"]
        log2_list = json_data[region.chrom.value]["cov"]
    else:
        data_type = "bed"

        # Bound start and end balues to 0-chrom_size
        end = min(
            new_end_pos, get_chromosome_size(db, region.chrom, req.genome_build).size
        )
        start = max(new_start_pos, 0)

        if not cov_fh:
            raise ValueError(f"Expected coverage file cov_fh, but found: {cov_fh}")

        if not baf_fh:
            raise ValueError(f"Expected BAF file baf_fh, but found: {baf_fh}")

        # Load BAF and Log2 data from tabix files
        log2_list = tabix_query(
            cov_fh,
            region.res,
            region.chrom,
            start,
            end,
            req.reduce_data,
        )
        baf_list = tabix_query(
            baf_fh,
            region.res,
            region.chrom,
            start,
            end,
            req.reduce_data,
        )

    # Convert the data to screen coordinates
    log2_records, baf_records = convert_data(
        graph,
        req,
        log2_list,
        baf_list,
        req.x_pos - extra_plot_width,
        new_start_pos,
        new_x_ampl,
        data_type=data_type,
    )
    if not new_start_pos and not log2_records and not baf_records:
        LOG.warning("No records for region")
    return region, new_start_pos, new_end_pos, log2_records, baf_records
