"""
Whole genome visualization of BAF and log2 ratio
"""

import logging
from logging.config import dictConfig

import connexion
from flask import redirect, request, url_for
from flask_compress import Compress
from flask_login import current_user

from .blueprints import gens_bp, home_bp, login_bp
from .cache import cache
from .config import AuthMethod, settings
from .db import SampleNotFoundError, init_database
from .errors import generic_abort_error, generic_exception_error, sample_not_found
from .auth import login_manager, oauth_client

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


def create_app():
    """Create and setup Gens application."""
    application = connexion.FlaskApp(__name__, specification_dir="openapi/")
    application.add_api("openapi.yaml")
    app = application.app
    # configure app
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False

    # initialize database and store db content
    with app.app_context():
        init_database()
    # connect to mongo client
    app.config["DEBUG"] = True
    app.config["SECRET_KEY"] = "pass"

    # prepare app context
    initialize_extensions(app)

    configure_extensions(app)

    # register bluprints and errors
    register_blueprints(app)
    # register_errors(app)

    @app.before_request
    def check_user():
        if settings.authentication == AuthMethod.DISABLED or not request.endpoint:
            return

        # check if the endpoint requires authentication
        static_endpoint = "static" in request.endpoint
        public_endpoint = getattr(
            app.view_functions[request.endpoint], "is_public", False
        )
        relevant_endpoint = not (static_endpoint or public_endpoint)
        # if endpoint requires auth, check if user is authenticated
        if relevant_endpoint and not current_user.is_authenticated:
            # combine visited URL (convert byte string query string to unicode!)
            next_url = "{}?{}".format(request.path, request.query_string.decode())
            login_url = url_for("home.landing", next=next_url)
            return redirect(login_url)

    return app


def initialize_extensions(app):
    """Initialize flask extensions."""
    cache.init_app(app)
    compress.init_app(app)
    login_manager.init_app(app)


def configure_extensions(app):
    # configure extensions
    if settings.authentication == AuthMethod.OAUTH:
        LOG.info("Google login enabled")
        # setup connection to google oauth2
        configure_oauth_login(app)


def configure_oauth_login(app):
    """Register the Google Oauth2 login client using config settings"""

    oauth_client.init_app(app)

    oauth_client.register(
        name="google",
        server_metadata_url=str(settings.oauth_discovery_url),
        client_id=settings.oauth_client_id,
        client_secret=settings.oauth_secret,
        client_kwargs={"scope": "openid email profile"},
    )


def register_errors(app):
    """Register error pages for gens app."""
    app.register_error_handler(SampleNotFoundError, sample_not_found)
    app.register_error_handler(404, generic_abort_error)
    app.register_error_handler(416, generic_abort_error)
    app.register_error_handler(500, generic_abort_error)
    app.register_error_handler(Exception, generic_exception_error)


def register_blueprints(app):
    """Register blueprints."""
    app.register_blueprint(gens_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(login_bp)
