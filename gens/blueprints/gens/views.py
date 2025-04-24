"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request
from pymongo.database import Database

from gens import version
from gens.config import UI_COLORS, settings
from gens.crud.genomic import get_chromosome_info
from gens.crud.samples import get_sample
from gens.db.collections import SAMPLES_COLLECTION
from gens.genomic import parse_region_str
from gens.models.genomic import GenomeBuild

from gens.config import settings

LOG = logging.getLogger(__name__)

gens_bp = Blueprint(
    "gens",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/gens/static",
)


@gens_bp.route("/viewer/<path:sample_name>", methods=["GET"])
def display_case(sample_name: str) -> str:
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

    parsed_region = parse_region_str(region)
    if not parsed_region:
        abort(416)

    # verify that sample has been loaded
    db: Database = current_app.config["GENS_DB"]

    # Check that BAF and Log2 file exists
    # FIXME move checks to the API instead
    _ = get_sample(db.get_collection(SAMPLES_COLLECTION), individual_id, case_id)

    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    # get annotation track
    annotation = request.args.get("annotation", settings.default_annotation_track)

    if parsed_region.end is None:
        chrom_info = get_chromosome_info(db, parsed_region.chromosome, genome_build)
        if chrom_info is None:
            raise ValueError(
                f"Chromosome {parsed_region.chromosome} is not found in the database"
            )
        parsed_region = parsed_region.model_copy(update={"end": chrom_info.size})

    return render_template(
        "gens.html",
        ui_colors=UI_COLORS,
        scout_base_url=settings.scout_url,
        chrom=parsed_region.chromosome,
        start=parsed_region.start,
        end=parsed_region.end,
        sample_name=sample_name,
        individual_id=individual_id,
        case_id=case_id,
        genome_build=genome_build.value,
        print_page=print_page,
        annotation=annotation,
        selected_variant=selected_variant,
        todays_date=date.today(),
        version=version,
        gens_api_url=settings.gens_api_url
    )
