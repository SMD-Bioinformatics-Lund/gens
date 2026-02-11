"""Authentication and login related functions."""

from urllib.parse import quote
from fastapi import Request
from flask import Flask
from itsdangerous import BadSignature
from authlib.integrations.flask_client import OAuth
from flask_login import LoginManager  # type: ignore
from flask_login import UserMixin

from gens.blueprints.login.views import load_user
from gens.models.base import User

login_manager = LoginManager()
oauth_client = OAuth()


class LoginUser(UserMixin):
    """User object that controls user roles and credentials."""

    def __init__(self, user_obj: User):
        """Create a new user object."""

        self.name = user_obj.name
        self.email = user_obj.email
        self.roles = user_obj.roles

        # set the attributes in the user_data as class attributes
        for key, value in user_obj.model_dump().items():
            setattr(self, key, value)

    def get_id(self) -> str:
        """Get email that acts as user id."""
        return self.email

    @property
    def is_admin(self) -> bool:
        """Check if the user is admin."""
        return "admin" in self.roles


def get_docs_login_redirect(request: Request) -> str:
    """Get login redirect URL for unauthorized docs access"""
    next_url = request.url.path
    if request.url.query:
        next_url = f"{next_url}?{request.url.query}"
    encoded_next_url = quote(next_url, safe="/?=&")
    return f"/landing?next={encoded_next_url}"


def is_docs_request_authorized(flask_app: Flask, request: Request) -> bool:
    """Check whether docs request should be allowed"""
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

