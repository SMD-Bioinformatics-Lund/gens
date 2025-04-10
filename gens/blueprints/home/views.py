"""About the software page."""

import logging
import os
from typing import Any

from flask import Blueprint, current_app, render_template, request
from pymongo.database import Database

from gens import version
from gens.config import settings
from gens.crud.annotations import get_data_update_timestamp
from gens.crud.samples import get_samples
from gens.db.collections import SAMPLES_COLLECTION

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
    page = request.args.get("page", 1, type=int)
    start = (page - 1) * SAMPLES_PER_PAGE
    samples, total_samples = get_samples(db.get_collection(SAMPLES_COLLECTION), start=start, n_samples=SAMPLES_PER_PAGE)
    # calculate pagination
    pagination_info = {
        "from": start + 1,
        "to": start + SAMPLES_PER_PAGE,
        "current_page": page,
        "last_page": (
            total_samples // SAMPLES_PER_PAGE
            if total_samples % SAMPLES_PER_PAGE == 0
            else (total_samples // SAMPLES_PER_PAGE) + 1
        ),
    }
    parsed_samples = [
        {
            "sample_id": smp.sample_id,
            "case_id": smp.case_id,
            "genome_build": smp.genome_build,
            "has_overview_file": smp.overview_file is not None,
            "files_present": os.path.isfile(smp.baf_file)
            and os.path.isfile(smp.coverage_file),
            "created_at": smp.created_at.strftime("%Y-%m-%d"),
        }
        for smp in samples
    ]
    return render_template(
        "home.html",
        pagination=pagination_info,
        samples=parsed_samples,
        total_samples=total_samples,
        scout_base_url=str(settings.scout_url),
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
        version=version,
    )
