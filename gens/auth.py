"""Authentication and login related functions."""

from typing import Any
from authlib.integrations.flask_client import OAuth
from flask_login import LoginManager  # type: ignore
from flask_login import UserMixin

from gens.models.base import User

login_manager = LoginManager()
oauth_client = OAuth()


class LoginUser(UserMixin):
    """User object that controlls user roles and credentials."""

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