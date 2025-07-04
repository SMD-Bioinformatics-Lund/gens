"""Functions for rendering Gens"""

import logging
from datetime import date

from flask import Blueprint, abort, current_app, render_template, request
from pymongo.database import Database

from gens import version
from gens.config import settings
from gens.crud.genomic import get_chromosome_info
from gens.crud.samples import get_samples_for_case, get_samples_per_case
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


@gens_bp.route("/viewer/<path:case_id>", methods=["GET"])
def display_samples(case_id: str) -> str:
    """
    Renders the Gens template
    Expects sample_id as input to be able to load the sample data
    """

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

    sample_id_list = request.args.get("sample_ids")
    if not sample_id_list:
        case_samples = get_samples_for_case(db.get_collection(SAMPLES_COLLECTION), case_id.split("&")[0])
        if not case_samples:
            raise ValueError(f"Expected sample_ids for case_id: {case_id}")
        sample_ids = [sample.sample_id for sample in case_samples]

        if request.args.get("genome_build") is None:
            genome_build = GenomeBuild(case_samples[0].genome_build)
    else:
        sample_ids = sample_id_list.split(",")

    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    # get annotation track
    annotation = request.args.get("annotation", settings.default_annotation_track)

    if parsed_region.end is None:
        chrom_info = get_chromosome_info(db, parsed_region.chromosome, genome_build)
        if chrom_info is None:
            raise ValueError(f"Chromosome {parsed_region.chromosome} is not found in the database")
        parsed_region = parsed_region.model_copy(update={"end": chrom_info.size})

    # FIXME: Something to think about here. Is this initial dict enough actually?
    samples_per_case = get_samples_per_case(db.get_collection(SAMPLES_COLLECTION))

    all_samples: list[dict[str, str]] = []
    for case_samples in samples_per_case.values():
        for sample in case_samples:
            sample_info = {
                "caseId": sample["case_id"],
                "sampleId": sample["sample_id"],
                "sampleType": sample.get("sample_type"),
                "genomeBuild": sample["genome_build"],
            }
            all_samples.append(sample_info)

    return render_template(
        "gens.html",
        scout_base_url=settings.scout_url,
        chrom=parsed_region.chromosome,
        start=parsed_region.start,
        end=parsed_region.end,
        case_id=case_id,
        sample_ids=sample_ids,
        all_samples=list(all_samples),
        genome_build=genome_build.value,
        print_page=print_page,
        annotation=annotation,
        selected_variant=selected_variant,
        todays_date=date.today(),
        version=version,
        gens_api_url=settings.gens_api_url,
        main_sample_types=settings.main_sample_types,
    )
