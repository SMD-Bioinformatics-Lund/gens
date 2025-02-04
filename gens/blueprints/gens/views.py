"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request

from gens import version
from gens.config import settings, UI_COLORS
from gens.cache import cache
from gens.db import query_sample
from gens.graph import parse_region_str
from gens.io import _get_filepath
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
def display_case(sample_name):
    """
    Renders the Gens template
    Expects sample_id as input to be able to load the sample data
    """
    case_id = request.args.get("case_id")
    if case_id is None:
        raise ValueError("You must provide a case id when opening a sample.")
    individual_id: str = request.args.get("individual_id", sample_name)
    
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
    db = current_app.config["GENS_DB"]
    sample = query_sample(db, individual_id, case_id, genome_build)

    # Check that BAF and Log2 file exists
    try:
        _get_filepath(sample.baf_file)
        _get_filepath(sample.coverage_file)
        if sample.overview_file:  # verify json if it exists
            _get_filepath(sample.overview_file)
    except FileNotFoundError as err:
        raise err
    else:
        LOG.info(f"Found BAF and COV files for {sample_name}")
    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    # get annotation track
    annotation = request.args.get(
        "annotation", settings.default_annotation_track
    )

    _, chrom, start_pos, end_pos = parsed_region
    return render_template(
        "gens.html",
        ui_colors=UI_COLORS,
        scout_base_url=current_app.config.get("SCOUT_BASE_URL"),
        chrom=chrom.value,
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
