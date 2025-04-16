"""
Whole genome visualization of BAF and log2 ratio
"""

import logging
from logging.config import dictConfig

from fastapi import FastAPI
from asgiref.wsgi import WsgiToAsgi
from flask import Flask, redirect, request, url_for
from flask_compress import Compress  # type: ignore
from flask_login import current_user  # type: ignore
from werkzeug.wrappers.response import Response

from gens.db.db import init_database_connection
from gens.exceptions import SampleNotFoundError

from .auth import login_manager, oauth_client
from .blueprints import gens_bp, home_bp, login_bp
from .config import AuthMethod, settings
from .errors import generic_abort_error, generic_exception_error, sample_not_found
from .routes import annotations, sample, base

dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            }
        },
        "handlers": {
            "wsgi": {
                "class": "logging.StreamHandler",
                "stream": "ext://flask.logging.wsgi_errors_stream",
                "formatter": "default",
            }
        },
        "root": {"level": "INFO", "handlers": ["wsgi"]},
    }
)
LOG = logging.getLogger(__name__)
compress = Compress()


def create_app() -> FastAPI:
    """Create and setup Gens application."""
    #application = connexion.FlaskApp(__name__, specification_dir="openapi/")
    #application.add_api("openapi.yaml")
    # setup fastapi app
    fastapi_app = FastAPI(title="Gens")
    add_api_routers(fastapi_app)

    # create and configure flask frontend
    flask_app: Flask = Flask(__name__)  # type: ignore
    flask_app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False

    # initialize database and store db content
    with flask_app.app_context():
        init_database_connection(flask_app)
    # connect to mongo client
    flask_app.config["DEBUG"] = True
    flask_app.config["SECRET_KEY"] = "pass"

    # prepare app context
    initialize_extensions(flask_app)

    configure_extensions(flask_app)

    # register bluprints and errors
    register_blueprints(flask_app)

    @flask_app.before_request
    def check_user() -> Flask|None|Response: # type: ignore
        """Check permission if page requires authentication."""
        if settings.authentication == AuthMethod.DISABLED or not request.endpoint:
            return None

        # check if the endpoint requires authentication
        static_endpoint = "static" in request.endpoint
        public_endpoint = getattr(
            flask_app.view_functions[request.endpoint], "is_public", False
        )
        relevant_endpoint = not (static_endpoint or public_endpoint)
        # if endpoint requires auth, check if user is authenticated
        if relevant_endpoint and not current_user.is_authenticated:
            # combine visited URL (convert byte string query string to unicode!)
            next_url = f"{request.path}?{request.query_string.decode()}"
            login_url = url_for("home.landing", next=next_url)
            return redirect(login_url)

    # mount flask app to FastAPI app
    fastapi_app.mount('/app', WsgiToAsgi(flask_app))
    return fastapi_app


def add_api_routers(app: FastAPI):
    app.include_router(base.router)
    app.include_router(sample.router)
    app.include_router(annotations.router)


def initialize_extensions(app: Flask) -> None:
    """Initialize flask extensions."""
    compress.init_app(app)
    login_manager.init_app(app)


def configure_extensions(app: Flask) -> None:
    """configure app extensions."""
    if settings.authentication == AuthMethod.OAUTH:
        LOG.info("Google login enabled")
        # setup connection to google oauth2
        configure_oauth_login(app)


def configure_oauth_login(app: Flask) -> None:
    """Register the Google Oauth2 login client using config settings"""

    oauth_client.init_app(app)

    oauth_settings = settings.oauth
    if oauth_settings is None:
        raise ValueError("OAuth settings must be present for Oauth login to work")

    oauth_client.register(
        name="google",
        server_metadata_url=str(oauth_settings.discovery_url),
        client_id=oauth_settings.client_id,
        client_secret=oauth_settings.secret,
        client_kwargs={"scope": "openid email profile"},
    )


def register_errors(app: Flask) -> None:
    """Register error pages for gens app."""
    app.register_error_handler(SampleNotFoundError, sample_not_found)
    app.register_error_handler(404, generic_abort_error)
    app.register_error_handler(416, generic_abort_error)
    app.register_error_handler(500, generic_abort_error)
    app.register_error_handler(Exception, generic_exception_error)


def register_blueprints(app: Flask) -> None:
    """Register blueprints."""
    app.register_blueprint(gens_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(login_bp)
