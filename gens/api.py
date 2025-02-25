"""API entry point and helper functions."""

import gzip
import json
import logging
import re
from typing import Any

import connexion
from fastapi.encoders import jsonable_encoder
from flask import current_app, jsonify
from pysam import TabixFile

from gens.db import (
    ANNOTATIONS_COLLECTION,
    TRANSCRIPTS_COLLECTION,
    get_chromosome_size,
    query_records_in_region,
    query_sample,
    query_variants,
)
from gens.exceptions import RegionParserException
from gens.graph import REQUEST, get_cov, overview_chrom_dimensions, parse_region_str
from gens.models.genomic import (
    Chromosome,
    GenomeBuild,
    QueryChromosomeCoverage,
    VariantCategory,
)

LOG = logging.getLogger(__name__)


def get_overview_chrom_dim(x_pos: int, y_pos: int, plot_width: int, genome_build: GenomeBuild) -> dict[str, Any]:
    """
    Returns the dimensions of all chromosome graphs in screen coordinates
    for drawing the chromosomes correctly in the overview graph
    """
    LOG.info(
        "Get overview chromosome dim: (%d, %d), w=%d, %s",
        x_pos, y_pos, plot_width, genome_build
    )
    query_result = {
        "status": "ok",
        "chrom_dims": overview_chrom_dimensions(x_pos, y_pos, plot_width, genome_build),
    }
    return jsonable_encoder(query_result)


def get_annotation_sources(genome_build: int):
    """
    Returns available annotation source files
    """
    with current_app.app_context():
        collection = current_app.config["GENS_DB"][ANNOTATIONS_COLLECTION]
        sources = collection.distinct("source", {"genome_build": str(genome_build)})
    return jsonify(status="ok", sources=sources)


def get_annotation_data(region: str, source: str, genome_build: int, collapsed: bool):
    """
    Gets annotation data in requested region and converts the coordinates
    to screen coordinates
    """
    if region == "" or source == "":
        msg = "Could not find annotation data in DB"
        LOG.error(msg)
        return (jsonify({"detail": msg}), 404)

    genome_build = GenomeBuild(genome_build)
    raw_region = parse_region_str(region, genome_build)

    annotations = []
    if raw_region is not None:
        # Get annotations within span [start_pos, end_pos] or annotations that
        # go over the span
        zoom_level, parsed_region = raw_region
        annotations = list(
            query_records_in_region(
                record_type=ANNOTATIONS_COLLECTION,
                region=parsed_region,
                genome_build=genome_build,
                source=source,
                height_order=1 if collapsed else None,
            )
        )

    # Calculate maximum height order
    max_height_order = (
        max(annotations, key=lambda e: e.height_order) if annotations else 1
    )

    query_result = {
        "status": "ok",
        "chromosome": parsed_region.chromosome,
        "start_pos": parsed_region.start,
        "end_pos": parsed_region.end,
        "annotations": annotations,
        "max_height_order": max_height_order,
        "res": zoom_level,
    }
    return jsonable_encoder(query_result)


def get_transcript_data(region: str, genome_build: str, collapsed: bool):
    """
    Gets transcript data for requested region and converts the coordinates to
    screen coordinates
    """
    genome_build_enum = GenomeBuild(genome_build)
    raw_region = parse_region_str(region, genome_build_enum)
    if raw_region is None:
        msg = "Could not find transcript in database"
        LOG.error(msg)
        return (jsonify({"detail": msg}), 404)

    # Get transcripts within span [start_pos, end_pos] or transcripts that go over the span
    zoom_level, parsed_region = raw_region
    transcripts = list(
        query_records_in_region(
            record_type=TRANSCRIPTS_COLLECTION,
            region=parsed_region,
            genome_build=genome_build_enum,
            height_order=1 if collapsed else None,
        )
    )
    # Calculate maximum height order
    max_height_order = max(t.height_order for t in transcripts) if transcripts else 1

    return jsonable_encoder(
        {
            "status": "ok",
            "chromosome": parsed_region.chromosome,
            "start_pos": parsed_region.start,
            "end_pos": parsed_region.end,
            "max_height_order": max_height_order,
            "res": zoom_level,
            "transcripts": list(transcripts),
        }
    )


def search_annotation(query: str, genome_build: str, annotation_type: str):
    """Search for anntations of genes and return their position."""
    # Lookup queried element
    collection = current_app.config["GENS_DB"][annotation_type]
    db_query: dict[str, str|re.Pattern[str]] = {"gene_name": re.compile("^" + re.escape(query) + "$", re.IGNORECASE)}

    if genome_build and int(genome_build) in GenomeBuild:
        db_query["genome_build"] = genome_build

    elements = list(collection.find(db_query, sort=[("start", 1), ("chrom", 1)]))
    # if no results was found
    if len(elements) == 0:
        msg = f"Did not find gene name: {query}"
        LOG.warning(msg)
        data = {"message": msg}
        response_code = 404
    else:
        start_elem = elements[0]
        end_elem = max(elements[0:], key=lambda elem: elem.get("end"))
        data = {
            "chromosome": start_elem.get("chrom"),
            "start_pos": start_elem.get("start"),
            "end_pos": end_elem.get("end"),
            "genome_build": start_elem.get("genome_build"),
        }
        response_code = 200

    return jsonify({**data, "status": response_code})


def get_variant_data(case_id, sample_id, variant_category, **optional_kwargs):
    """Search Scout database for variants associated with a case and return info in JSON format."""
    default_height_order = 0
    base_return = {"status": "ok"}
    # get optional variables
    genome_build = optional_kwargs.get("genome_build")
    region = optional_kwargs.get("region")
    # if getting variants from specific regions
    region_params = {}
    if region is not None and genome_build is not None:
        zoom_level, region = parse_region_str(region, genome_build)
        base_return = {
            **base_return,
            **region.model_dump(),
            "res": zoom_level.value,
            "max_height_order": default_height_order,
        }
        # limit renders to b or greater resolution
    # query variants
    try:
        variants = list(
            query_variants(
                case_id,
                sample_id,
                VariantCategory(variant_category),
                **region_params,
            )
        )
    except ValueError as err:
        return (jsonify({"detail": str(err)}), 404)
    # return all detected variants
    return (
        jsonable_encoder(
            {
                **base_return,
                "variants": variants,
                "max_height_order": 1,
            }
        ),
        200,
    )


def get_multiple_coverages() -> dict[str, Any] | tuple[Any, int]:
    """Read default Log2 ratio and BAF values for overview graph."""
    data = QueryChromosomeCoverage(**connexion.request.get_json())
    LOG.info("Got request for all chromosome coverages: %s", data.sample_id)

    # read sample information
    db = current_app.config["GENS_DB"]
    sample_obj = query_sample(db, data.sample_id, data.case_id)
    # Try to find and load an overview json data file
    json_data, cov_file, baf_file = None, None, None
    if sample_obj.overview_file.is_file():
        LOG.info("Using json overview file: %s", sample_obj.overview_file)
        with gzip.open(sample_obj.overview_file, "r") as json_gz:
            json_data = json.loads(json_gz.read().decode("utf-8"))
    else:
        # Fall back to BED files if json files does not exists
        cov_file = TabixFile(str(sample_obj.coverage_file))
        baf_file = TabixFile(str(sample_obj.baf_file))

    results = {}
    for chrom_info in data.chromosome_pos:
        # Set some input values
        req = REQUEST(
            chrom_info.region,
            chrom_info.x_pos,
            chrom_info.y_pos,
            data.plot_height,
            data.top_bottom_padding,
            data.baf_y_start,
            data.baf_y_end,
            data.log2_y_start,
            data.log2_y_end,
            data.genome_build,
            data.reduce_data,
        )
        # try:
        with current_app.app_context():
            reg, *_, log2_rec, baf_rec = get_cov(
                req,
                chrom_info.x_ampl,
                json_data=json_data,
                cov_fh=cov_file,
                baf_fh=baf_file,
            )
        # except RegionParserException as err:
        #     LOG.error(f"{type(err).__name__} - {err}")
        #     return (jsonify({"detail": str(err)}), 416)
        # except Exception as err:
        #     LOG.error(f"{type(err).__name__} - {err}")
        #     return (jsonify({"detail": str(err)}), 500)

        results[chrom_info.chromosome] = {
            "data": log2_rec,
            "baf": baf_rec,
            "chrom": reg.chrom,
            "x_pos": round(req.x_pos),
            "y_pos": round(req.y_pos),
            "start": reg.start_pos,
            "end": reg.end_pos,
        }
    return jsonable_encoder({"results": results, "status": "ok"})


def get_coverage(
    sample_id: str,
    case_id: str,
    region,
    x_pos,
    y_pos,
    plot_height,
    top_bottom_padding,
    baf_y_start,
    baf_y_end,
    log2_y_start,
    log2_y_end,
    genome_build,
    reduce_data,
    x_ampl,
):
    """
    Reads and formats Log2 ratio and BAF values for overview graph
    Returns the coverage in screen coordinates for frontend rendering
    """
    # Validate input
    if sample_id == "":
        msg = f"Invalid case_id: {sample_id}"
        LOG.error(msg)
        return (jsonify({"detail": msg}), 416)

    # Set some input values
    req = REQUEST(
        region,
        x_pos,
        y_pos,
        plot_height,
        top_bottom_padding,
        baf_y_start,
        baf_y_end,
        log2_y_start,
        log2_y_end,
        genome_build,
        reduce_data,
    )
    db = current_app.config["GENS_DB"]

    # TODO respond with 404 error if file is not found
    sample_obj = query_sample(db, sample_id, case_id)
    cov_file = TabixFile(str(sample_obj.coverage_file))
    baf_file = TabixFile(str(sample_obj.baf_file))

    # Parse region
    try:
        with current_app.app_context():
            reg, n_start, n_end, log2_rec, baf_rec = get_cov(
                req, x_ampl, cov_fh=cov_file, baf_fh=baf_file
            )
    except RegionParserException as err:
        LOG.error("%s - %s", type(err).__name__, err)
        return (jsonify({"detail": str(err)}), 416)
    except Exception as err:
        LOG.error("%s - %s", type(err).__name__, err)
        return (jsonify({"detail": str(err)}), 500)

    query_result = {
        "data": log2_rec,
        "baf": baf_rec,
        "chrom": reg.chrom,
        "x_pos": round(req.x_pos),
        "y_pos": round(req.y_pos),
        "query_start": reg.start_pos,
        "query_end": reg.end_pos,
        "padded_start": n_start,
        "padded_end": n_end,
        "status": "ok",
    }
    return jsonable_encoder(query_result)


def get_chromosome_info(chromosome, genome_build):
    """Query the database for information on a chromosome."""
    db = current_app.config["GENS_DB"]

    # validate input
    genome_build = GenomeBuild(genome_build)
    chromosome = Chromosome(chromosome)

    # query for chromosome
    chrom_info = get_chromosome_size(db, chromosome, genome_build)
    return jsonable_encoder(chrom_info)
