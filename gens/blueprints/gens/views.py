"""Functions for rendering Gens"""

from http import HTTPStatus
import logging
from datetime import date
from pathlib import Path
from typing import Iterable

from flask import Blueprint, abort, current_app, render_template, request
from pymongo.database import Database

from gens.__version__ import VERSION as version
from gens.config import settings
from gens.crud.genomic import get_chromosome_info
from gens.crud.samples import get_sample, get_samples_for_case, get_samples_per_case
from gens.db.collections import SAMPLES_COLLECTION
from gens.exceptions import SampleNotFoundError
from gens.genomic import parse_region_str
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleInfo

LOG = logging.getLogger(__name__)

gens_bp = Blueprint(
    "gens",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/gens/static",
)

def _validate_sample_files(samples: Iterable[SampleInfo]) -> None:
    for sample in samples:
        for file_path in (sample.baf_file, sample.coverage_file):
            if file_path is None or not Path(file_path).is_file():
                raise FileNotFoundError(file_path)

def _render_sample_error(message: str):
    return (
        render_template(
            "sample_error.html",
            headline="Sample unavailable",
            message=message
        ),
        HTTPStatus.NOT_FOUND,
    )


@gens_bp.route("/viewer/<path:case_id>", methods=["GET"])
def display_samples(case_id: str):
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
    genome_build_arg = request.args.get("genome_build", "38")
    try:
        with current_app.app_context():
            genome_build = GenomeBuild(int(genome_build_arg))
    except (TypeError, ValueError):
        LOG.exception("Invalid genome build provided: %s", genome_build_arg)
        return _render_sample_error("The provided genome build is not supported.")

    parsed_region = parse_region_str(region)
    if not parsed_region:
        abort(416)

    # verify that sample has been loaded
    db: Database = current_app.config["GENS_DB"]

    sample_id_list = request.args.get("sample_ids")
    if not sample_id_list:

        samples_collection = db.get_collection(SAMPLES_COLLECTION)
        try:
            case_samples = get_samples_for_case(samples_collection, case_id)
            if not case_samples:
                raise SampleNotFoundError(f"No sample found for case_id: {case_id}", case_id)
        except SampleNotFoundError:
            LOG.exception("No samples found for case %s", case_id)
            return _render_sample_error("Not able to find the sample")
        
        except FileNotFoundError:
            LOG.exception("Missing coverage or baf files for case %s", case_id)
            return _render_sample_error("Was not able to find the cov/baf data for the sample")

        sample_ids = [sample.sample_id for sample in case_samples]

        if request.args.get("genome_build") is None:
            genome_build = GenomeBuild(case_samples[0].genome_build)
    else:
        sample_ids = [sample_id for sample_id in sample_id_list.split(",") if sample_id]
        try:
            requested_samples = [
                get_sample(
                    db.get_collection(SAMPLES_COLLECTION),
                    sample_id=sample_id,
                    case_id=case_id,
                    genome_build=genome_build
                )
                for sample_id in sample_ids
            ]
            _validate_sample_files(requested_samples)
        except SampleNotFoundError:
            LOG.exception("Requested sample not found for case %s", case_id)
            return _render_sample_error("Not able to find the sample")
        except FileNotFoundError:
            LOG.exception("Requested sample missing coverage or baf files for case %s", case_id)
            return _render_sample_error("Was not able to find the cov/baf data for the sample")

    # which variant to highlight as focused
    selected_variant = request.args.get("variant")

    if parsed_region.end is None:
        chrom_info = get_chromosome_info(db, parsed_region.chromosome, genome_build)
        if chrom_info is None:
            raise ValueError(
                f"Chromosome {parsed_region.chromosome} is not found in the database"
            )
        parsed_region = parsed_region.model_copy(update={"end": chrom_info.size})

    samples_per_case = get_samples_per_case(db.get_collection(SAMPLES_COLLECTION))

    all_samples: list[dict[str, str]] = []
    for samples_per_case_dict in samples_per_case.values():
        for sample in samples_per_case_dict:
            sample_info = {
                "caseId": sample["case_id"],
                "sampleId": sample["sample_id"],
                "sampleType": sample.get("sample_type"),
                "genomeBuild": sample["genome_build"],
            }
            all_samples.append(sample_info)

    return render_template(
        "gens.html",
        scout_base_url=settings.variant_url,
        chrom=parsed_region.chromosome,
        start=parsed_region.start,
        end=parsed_region.end,
        case_id=case_id,
        sample_ids=sample_ids,
        all_samples=list(all_samples),
        genome_build=genome_build.value,
        print_page=print_page,
        selected_variant=selected_variant,
        todays_date=date.today(),
        version=version,
        gens_api_url=settings.gens_api_url,
        main_sample_types=settings.main_sample_types,
    )
