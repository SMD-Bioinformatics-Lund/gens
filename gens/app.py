"""
Whole genome visualization of BAF and log2 ratio
"""

import logging
from logging.config import dictConfig
from typing import Any
from urllib.parse import quote

from asgiref.wsgi import WsgiToAsgi
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.responses import JSONResponse, RedirectResponse
from flask import Flask, redirect, request, url_for
from flask_compress import Compress  # type: ignore
from flask_login import current_user  # type: ignore
from itsdangerous import BadSignature
from werkzeug.wrappers.response import Response

from gens.blueprints.gens.views import gens_bp
from gens.blueprints.home.views import home_bp
from gens.blueprints.login.views import login_bp
from gens.db.db import init_database_connection
from gens.exceptions import SampleNotFoundError

from .auth import (
    login_manager,
    oauth_client,
)
from .config import AuthMethod, settings
from .errors import generic_abort_error, generic_exception_error, sample_not_found
from .routes import annotations, base, gene_lists, sample, sample_annotations

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
    # application = connexion.FlaskApp(__name__, specification_dir="openapi/")
    # application.add_api("openapi.yaml")
    # setup fastapi app
    fastapi_app = FastAPI(
        title="Gens",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    # create and configure flask frontend
    flask_app: Flask = Flask(__name__)  # type: ignore
    flask_app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False

    # initialize database and store db content
    with flask_app.app_context():
        init_database_connection(flask_app)
    # connect to mongo client
    flask_app.config["DEBUG"] = True
    flask_app.config["SECRET_KEY"] = settings.secret_key
    if settings.secret_key == "pass":
        LOG.warning(
            "Using default SECRET_KEY value. Configure secret_key in production."
        )

    # prepare app context
    initialize_extensions(flask_app)

    configure_extensions(flask_app)

    # register bluprints and errors
    register_blueprints(flask_app)

    async def require_api_auth(request: Request) -> None:
        """Require a valid logged-in session for API routes"""

        if settings.authentication == AuthMethod.DISABLED:
            return
        if not is_docs_request_authorized(flask_app, request):
            raise HTTPException(status_code=401, detail="Authentication required")

    add_api_routers(fastapi_app, dependencies=[Depends(require_api_auth)])

    @flask_app.before_request
    def check_user() -> Flask | None | Response:  # type: ignore
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

    # Require the user to be authenticated before accessing the FastAPI access points
    @fastapi_app.get("/api/openapi.json", include_in_schema=False)
    async def openapi_json(request: Request):
        if not is_docs_request_authorized(flask_app, request):
            return JSONResponse(
                status_code=401, content={"detail": "Authentication required"}
            )
        return JSONResponse(fastapi_app.openapi())

    @fastapi_app.get("/api/docs", include_in_schema=False)
    async def swagger_ui(request: Request):
        if not is_docs_request_authorized(flask_app, request):
            return RedirectResponse(url=get_docs_login_redirect(request))
        return get_swagger_ui_html(
            openapi_url="/api/openapi.json",
            title=f"{fastapi_app.title} - Swagger UI",
            oauth2_redirect_url="/api/docs/oauth2-redirect",
        )

    @fastapi_app.get("/api/docs/oauth2-redirect", include_in_schema=False)
    async def swagger_ui_oauth2_redirect(request: Request):
        if not is_docs_request_authorized(flask_app, request):
            return RedirectResponse(url=get_docs_login_redirect(request))
        return get_swagger_ui_oauth2_redirect_html()

    @fastapi_app.get("/api/redoc", include_in_schema=False)
    async def redoc(request: Request):
        if not is_docs_request_authorized(flask_app, request):
            return RedirectResponse(url=get_docs_login_redirect(request))
        return get_redoc_html(
            openapi_url="/api/openapi.json",
            title=f"{fastapi_app.title} - ReDoc",
        )

    # mount flask app to FastAPI app
    fastapi_app.mount("/", WsgiToAsgi(flask_app))
    return fastapi_app


def is_docs_request_authorized(flask_app: Flask, request: Request) -> bool:
    """Check whether docs request should be allowed"""
    # Import lazily to avoid circular imports during app/test startup.
    from gens.blueprints.login.views import load_user

    session_cookie_name = flask_app.config.get("SESSION_COOKIE_NAME", "session")
    session_cookie = request.cookies.get(session_cookie_name)
    if session_cookie is None:
        return False

    serializer_factory = getattr(
        flask_app.session_interface, "get_signing_serializer", None
    )
    if serializer_factory is None:
        return False

    serializer = serializer_factory(flask_app)
    if serializer is None:
        return False

    try:
        session_data = serializer.loads(session_cookie)
    except BadSignature:
        return False

    user_id = session_data.get("_user_id")
    if not user_id:
        return False

    with flask_app.app_context():
        return load_user(str(user_id)) is not None


def get_docs_login_redirect(request: Request) -> str:
    """Get login redirect URL for unauthorized docs access"""
    next_url = request.url.path
    if request.url.query:
        next_url = f"{next_url}?{request.url.query}"
    encoded_next_url = quote(next_url, safe="/?=&")
    return f"/landing?next={encoded_next_url}"


def add_api_routers(app: FastAPI, dependencies: list[Any] | None = None) -> None:
    api_prefix = "/api"
    app.include_router(base.router, prefix=api_prefix, dependencies=dependencies)
    app.include_router(sample.router, prefix=api_prefix, dependencies=dependencies)
    app.include_router(annotations.router, prefix=api_prefix, dependencies=dependencies)
    app.include_router(
        sample_annotations.router, prefix=api_prefix, dependencies=dependencies
    )
    app.include_router(gene_lists.router, prefix=api_prefix, dependencies=dependencies)


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
