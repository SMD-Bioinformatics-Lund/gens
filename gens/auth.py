"""Authentication and login related functions."""

from authlib.integrations.flask_client import OAuth
from flask_login import LoginManager  # type: ignore

login_manager = LoginManager()
oauth_client = OAuth()
