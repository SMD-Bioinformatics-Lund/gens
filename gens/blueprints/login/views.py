"""Views for logging in and logging out users."""

import logging
from typing import Any

from pymongo.database import Database
from flask import Blueprint, flash, redirect, request, session, url_for, current_app
from flask_login import login_user, logout_user
from werkzeug.wrappers.response import Response

from gens.config import AuthMethod, settings
from gens.auth import LoginUser

from gens.auth import login_manager, oauth_client
from gens.crud.user import get_user
from gens.db.collections import USER_COLLECTION
from ..home.views import public_endpoint

# from . import controllers

LOG = logging.getLogger(__name__)


@login_manager.user_loader
def load_user(user_id: str) -> LoginUser | None:
    """Returns the currently active user as an object."""
    # get database instance
    db: Database[Any] = current_app.config["GENS_DB"]
    user_col = db.get_collection(USER_COLLECTION)
    user_obj = get_user(user_col, user_id)  # type: ignore
    if user_obj is not None:
        return LoginUser(user_obj)
    return None


login_bp = Blueprint(
    "login",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/login/static",
)

login_manager.login_view = "login.login"  # type: ignore
login_manager.login_message = "Please log in to access this page."
login_manager.login_message_category = "info"


@login_bp.route("/login", methods=["GET", "POST"])
@public_endpoint
def login() -> Response:
    """Login a user using the auth method specified in the configuration."""

    if "next" in request.args:
        session["next_url"] = request.args["next"]

    if settings.authentication == AuthMethod.OAUTH:
        if session.get("email"):
            user_mail = session["email"]
            session.pop("email", None)
        else:

            LOG.info("Google Login!")
            redirect_uri = url_for(".authorized", _external=True)
            try:
                return oauth_client.google.authorize_redirect(redirect_uri)  # type: ignore
            except Exception as error:
                LOG.error("An error occurred while trying use OAUTH - %s", error)
                flash("An error has occurred while logging user in using Google OAuth")

    if request.form.get("email"):  # Log in against Scout database
        user_mail = request.form.get("email")
        LOG.info("Validating user %s against Scout database", user_mail)

    db: Database[Any] = current_app.config["GENS_DB"]
    user_col = db.get_collection(USER_COLLECTION)
    user_obj = get_user(user_col, user_mail)  # type: ignore
    if user_obj is None:
        flash("User not found in Scout database", "warning")
        return redirect(url_for("home.landing"))

    return perform_login(LoginUser(user_obj))


@login_bp.route("/authorized")
@public_endpoint
def authorized() -> Response:
    """Google auth callback function"""

    oauth_google = oauth_client.google
    if oauth_google is None:
        raise ValueError("Google attribute not present on oauth object")

    token = oauth_google.authorize_access_token()
    google_user = oauth_google.parse_id_token(token, None)
    session["email"] = google_user.get("email").lower()
    session["name"] = google_user.get("name")
    session["locale"] = google_user.get("locale")

    return redirect(url_for(".login"))


@login_bp.route("/logout")
def logout() -> Response:
    """Logout user and clear user credentials from session."""

    logout_user()
    session.pop("email", None)
    session.pop("name", None)
    session.pop("locale", None)
    flash("You have been logged out", "success")
    return redirect(url_for("home.landing"))


def perform_login(user_dict: LoginUser) -> Response:
    """Conduct login.

    If successful redirect to next page otherwise redirect to the landing page.
    """
    if login_user(user_dict, remember=True):
        flash(f"You logged in as: {user_dict.name}", "success")
        next_url = session.pop("next_url", None)
        return redirect(request.args.get("next") or next_url or url_for("home.home"))
    flash("Sorry, you were not logged in", "warning")
    return redirect(url_for("home.landing"))
