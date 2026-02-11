"""Views for logging in and logging out users."""

import logging
from typing import Any
from urllib.parse import urlsplit

from flask import Blueprint, current_app, flash, redirect, request, session, url_for
from flask_login import login_user, logout_user
from ldap3 import Connection, Server
from ldap3.core.exceptions import LDAPException
from pymongo.database import Database
from werkzeug.wrappers.response import Response

from gens.auth import LoginUser, login_manager, oauth_client
from gens.config import AuthMethod, AuthUserDb, LdapConfig, settings
from gens.crud.user import get_user
from gens.db.collections import USER_COLLECTION

from ..home.views import public_endpoint

# from . import controllers

LOG = logging.getLogger(__name__)


def normalize_email(email: str) -> str:
    """Normalize email/user id values used for login lookups."""

    return email.strip().lower()


def is_safe_next_url(next_url: str | None) -> bool:
    """Return True for local URLs that are safe to redirect to."""

    if not next_url:
        return False
    parsed_url = urlsplit(next_url)
    return (
        parsed_url.scheme == "" and parsed_url.netloc == "" and next_url.startswith("/")
    )


def get_user_database() -> Database[Any] | None:
    """Return the configured user database for authentication lookups."""

    database_key = "GENS_DB"
    if settings.auth_user_db == AuthUserDb.VARIANT:
        database_key = "VARIANT_DB"

    user_db = current_app.config.get(database_key)
    if user_db is None:
        LOG.error(
            "Configured user database '%s' is not available in app config (%s)",
            settings.auth_user_db.value,
            database_key,
        )
        return None
    return user_db


def get_login_user(email: str) -> LoginUser | None:
    """Get a login user from the configured authentication user collection."""

    user_db = get_user_database()
    if user_db is None:
        return None

    user_col = user_db.get_collection(settings.auth_user_collection or USER_COLLECTION)
    user_obj = get_user(user_col, normalize_email(email))
    if user_obj is None:
        return None
    return LoginUser(user_obj)


def authenticate_with_ldap(
    username: str, password: str, ldap_config: LdapConfig | None = None
) -> bool:
    """Authenticate a user using LDAP direct bind"""

    configuration = ldap_config or settings.ldap
    if configuration is None:
        LOG.warning("LDAP authentication requested but no LDAP config is present")
        return False

    try:
        bind_dn = configuration.bind_user_template.format(username=username)
    except KeyError as error:
        LOG.error("Failed to format LDAP bind DN: missing %s", error)
        return False

    server = Server(str(configuration.server))

    try:
        with Connection(
            server, user=bind_dn, password=password, auto_bind=True
        ) as connection:
            return connection.bound
    except LDAPException as error:
        LOG.warning("LDAP authentication failed for %s", username)
        LOG.debug("LDAP exception: %s", error)
    return False


@login_manager.user_loader
def load_user(user_id: str) -> LoginUser | None:
    """Returns the currently active user as an object."""
    return get_login_user(user_id)


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
        next_url = request.args.get("next")
        if is_safe_next_url(next_url):
            session["next_url"] = next_url
        elif next_url:
            LOG.warning("Rejected unsafe login redirect URL: %s", next_url)

    user_mail: str | None = None
    if settings.authentication == AuthMethod.OAUTH:
        oauth_email = session.pop("email", None)
        if oauth_email:
            user_mail = normalize_email(str(oauth_email))
        else:
            oauth_google = oauth_client.google
            if oauth_google is None:
                discovery_url = (
                    str(settings.oauth.discovery_url) if settings.oauth else "missing"
                )
                LOG.error(
                    "OAuth login requested, but oauth_client.google is not configured. "
                    "Check OAuth settings (discovery_url=%s).",
                    discovery_url,
                )
                flash(
                    "OAuth login is not configured correctly. Check server OAuth settings.",
                    "warning",
                )
                return redirect(url_for("home.landing"))

            LOG.info("Initiating OAuth login")
            redirect_uri = url_for(".authorized", _external=True)
            try:
                return oauth_google.authorize_redirect(  # type: ignore
                    redirect_uri,
                    prompt="login",
                )
            except Exception as error:
                discovery_url = (
                    str(settings.oauth.discovery_url) if settings.oauth else "missing"
                )
                LOG.exception(
                    "Failed to initiate OAuth login redirect (redirect_uri=%s, discovery_url=%s)",
                    redirect_uri,
                    discovery_url,
                )
                flash(f"Could not start OAuth login: {error}", "warning")
                return redirect(url_for("home.landing"))
    elif request.method == "POST":
        user_mail = request.form.get("email")
        if not user_mail:
            flash("Please enter an email", "warning")
            return redirect(url_for("home.landing"))
        user_mail = normalize_email(user_mail)
        if not user_mail:
            flash("Please enter an email", "warning")
            return redirect(url_for("home.landing"))

        if settings.authentication == AuthMethod.LDAP:
            password = request.form.get("password")
            if not password:
                flash("Please enter both email and password", "warning")
                return redirect(url_for("home.landing"))

            if not authenticate_with_ldap(user_mail, password):
                flash(
                    "Could not authenticate user with LDAP. Verify email and password.",
                    "warning",
                )
                return redirect(url_for("home.landing"))

    else:
        return redirect(url_for("home.landing"))

    if user_mail is None:
        flash("Unable to log in with the provided credentials", "warning")
        return redirect(url_for("home.landing"))

    user_db = get_user_database()
    if user_db is None:
        flash(
            (
                f"Could not authenticate user because auth_user_db="
                f"'{settings.auth_user_db.value}' is not available."
            ),
            "warning",
        )
        return redirect(url_for("home.landing"))

    user_col = user_db.get_collection(settings.auth_user_collection or USER_COLLECTION)
    user_obj = get_user(user_col, user_mail)
    if user_obj is None:
        flash(
            f"User '{user_mail}' does not exist in the configured user database.",
            "warning",
        )
        return redirect(url_for("home.landing"))

    return perform_login(login_user_obj)


@login_bp.route("/authorized")
@public_endpoint
def authorized() -> Response:
    """Google auth callback function"""

    oauth_google = oauth_client.google
    if oauth_google is None:
        LOG.error("OAuth callback requested, but oauth_client.google is not configured.")
        flash("OAuth callback failed because OAuth client is not configured.", "warning")
        return redirect(url_for("home.landing"))

    try:
        token = oauth_google.authorize_access_token()
        google_user = oauth_google.parse_id_token(token, None)
    except Exception as error:
        LOG.exception("OAuth callback processing failed")
        flash(f"OAuth callback failed: {error}", "warning")
        return redirect(url_for("home.landing"))

    email = google_user.get("email") if google_user else None
    if not email:
        flash("Google login did not provide an email address", "warning")
        return redirect(url_for("home.landing"))
    session["email"] = normalize_email(str(email))
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
        redirect_url = next_url if is_safe_next_url(next_url) else url_for("home.home")
        return redirect(redirect_url)
    flash("Sorry, you were not logged in", "warning")
    return redirect(url_for("home.landing"))
