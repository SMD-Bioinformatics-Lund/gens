"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request
from pymongo.database import Database

from gens import version
from gens.config import UI_COLORS, settings
from gens.db import SAMPLES_COLLECTION, query_sample
from gens.graph import parse_region_str
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)

gens_bp = Blueprint(
    "gens",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/gens/static",
)


@gens_bp.route("/<path:sample_name>", methods=["GET"])
def display_case(sample_name) -> str:
    """
    Renders the Gens template
    Expects sample_id as input to be able to load the sample data
    """
    case_id = request.args.get("case_id")
    if case_id is None:
        raise ValueError("You must provide a case id when opening a sample.")
    individual_id = request.args.get("individual_id", sample_name)
    if not individual_id:
        raise ValueError(f"Expected individual_id, found: {individual_id}")

    # get genome build and region
    region = request.args.get("region", None)
    print_page = request.args.get("print_page", "false")
    # if region is not set with args get it from the form
    if not region:
        region = request.form.get("region", "1:1-None")

    # Parse region, default to grch38
    with current_app.app_context():
        genome_build = GenomeBuild(int(request.args.get("genome_build", "38")))

    parsed_region = parse_region_str(region, genome_build)
    if not parsed_region:
        abort(416)

    # verify that sample has been loaded
    db: Database = current_app.config["GENS_DB"]

    # Check that BAF and Log2 file exists
    # FIXME move checks to the API instead
    _ = query_sample(db[SAMPLES_COLLECTION], individual_id, case_id)

    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    # get annotation track
    annotation = request.args.get("annotation", settings.default_annotation_track)

    (_, region) = parsed_region

    # FIXME: This is due to mypys lack of understanding of the "computer_field" in the pydantic models
    # Look into how to resolve this
    chromosome = region.chromosome.value  # type: ignore
    start_pos = region.start  # type: ignore
    end_pos = region.end  # type: ignore

    if chromosome is None:
        raise ValueError("Expected a region with a valid chromosome value")

    if start_pos is None:
        raise ValueError("Expected a region with a valid start value")

    if end_pos is None:
        raise ValueError("Expected a region with a valid end value")


    return render_template(
        "gens.html",
        ui_colors=UI_COLORS,
        scout_base_url=current_app.config.get("SCOUT_BASE_URL"),
        chrom=chromosome,
        start=start_pos,
        end=end_pos,
        sample_name=sample_name,
        individual_id=individual_id,
        case_id=case_id,
        genome_build=genome_build.value,
        print_page=print_page,
        annotation=annotation,
        selected_variant=selected_variant,
        todays_date=date.today(),
        version=version,
    )
