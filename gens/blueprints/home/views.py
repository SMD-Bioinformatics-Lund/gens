"""About the software page."""

import logging
from typing import Any

from flask import Blueprint, current_app, render_template, request
from pymongo.database import Database

from gens.__version__ import VERSION as version
from gens.config import settings
from gens.crud.annotations import get_data_update_timestamp
from gens.crud.samples import get_samples_per_case
from gens.db.collections import SAMPLES_COLLECTION
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)

SAMPLES_PER_PAGE = 20

home_bp = Blueprint(
    "home",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/home/static",
)


# define views
@home_bp.route("/", methods=["GET", "POST"])
@home_bp.route("/home", methods=["GET", "POST"])
def home() -> str:
    """Gens home page with list of all samples."""

    db: Database = current_app.config["GENS_DB"]
    # set pagination
    samples_per_case = get_samples_per_case(db.get_collection(SAMPLES_COLLECTION))
    parsed_samples = [
        {
            "case_id": case_id,
            "sample_ids": [s["sample_id"] for s in samples],
            "genome_build": samples[0]["genome_build"],
            "has_overview_file": len([s for s in samples if not s["has_overview_file"]])
            == 0,
            "files_present": len([s for s in samples if not s["files_present"]]) == 0,
            "created_at": samples[0]["created_at"],
        }
        for (case_id, samples) in samples_per_case.items()
    ]

    with current_app.app_context():
        genome_build = GenomeBuild(int(request.args.get("genome_build", "38")))

    return render_template(
        "home.html",
        samples=parsed_samples,
        total_samples=len(samples_per_case),
        variant_software_base_url=(
            str(settings.variant_url) if settings.variant_url is not None else None
        ),
        gens_api_url=str(settings.gens_api_url),
        main_sample_types=settings.main_sample_types,
        genome_build=genome_build.value,
        version=version,
    )


@home_bp.route("/about")
def about() -> str:
    """Gens about page with rudimentary statistics."""
    with current_app.app_context():
        db: Database[Any] = current_app.config["GENS_DB"]
        timestamps = get_data_update_timestamp(db)
        print("Printing config")
        print(current_app.config)
        config = settings.get_dict()
        config["ENV"] = current_app.config.get("ENV")
        ui_colors = current_app.config.get("UI_COLORS")
    return render_template(
        "about.html",
        config=config,
        timestamps=timestamps,
        ui_colors=ui_colors,
        version=version,
    )


def public_endpoint(fn: Any) -> Any:
    """Set an endpoint as public"""
    fn.is_public = True
    return fn


@home_bp.route("/landing")
@public_endpoint
def landing() -> str:
    """Gens landing page."""

    return render_template(
        "landing.html",
        authentication=settings.authentication,
        version=version,
    )
