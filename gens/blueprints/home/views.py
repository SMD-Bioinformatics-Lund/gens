"""About the software page."""

import logging
import os
from typing import Any

from flask import Blueprint, current_app, render_template, request
from pymongo.database import Database

from gens import version
from gens.config import settings
from gens.crud.annotations import get_data_update_timestamp
# from gens.crud.samples import get_samples
from gens.crud.samples import get_samples_per_case
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
    samples_per_case = get_samples_per_case(
        db.get_collection(SAMPLES_COLLECTION), skip=start, limit=SAMPLES_PER_PAGE
    )
    # FIXME: Temporary case solutions
    pagination_info = {
        "from": start + 1,
        "to": start + SAMPLES_PER_PAGE,
        "current_page": page,
        "last_page": (
            len(samples_per_case) // SAMPLES_PER_PAGE
            if len(samples_per_case) % SAMPLES_PER_PAGE == 0
            else (len(samples_per_case) // SAMPLES_PER_PAGE) + 1
        ),
    }
    parsed_samples = [
        {
            "case_id": case_id,
            "sample_ids": [s.sample_id for s in samples],
            "genome_build": samples[0].genome_build,
            "has_overview_file": len([s for s in samples if s.overview_file is None]) == 0,
            "files_present": len([s for s in samples if s.overview_file is None or s.coverage_file is None]) == 0,
            "created_at": samples[0].created_at.strftime("%Y-%m-%d"),
        }
        for (case_id, samples) in samples_per_case.items()
    ]
    return render_template(
        "home.html",
        pagination=pagination_info,
        samples=parsed_samples,
        total_samples=len(samples_per_case),
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
