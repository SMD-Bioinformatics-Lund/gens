"""Retrieve users from scout db"""

from flask import current_app as app
from flask_login import UserMixin


class LoginUser(UserMixin):
    """User object that controlls user roles and credentials."""

    def __init__(self, user_data: dict[str, str]):
        """Create a new user object."""

        self.email = user_data['email']
        self.roles: list[str] = []

        # set the attributes in the user_data as class attributes
        for key, value in user_data.items():
            setattr(self, key, value)

    # FIXME: Type does not work correctly here. Solved by mongo data types?
    def get_id(self) -> str:
        """Get email that acts as user id."""
        return self.email

    @property
    def is_admin(self) -> bool:
        """Check if the user is admin."""
        return "admin" in self.roles


def user(email: str) -> LoginUser | None:
    """Query the daatabase for a user.
    
    If user exist return a flask login user object otherwise return null.
    """
    db = app.config["SCOUT_DB"]

    query = {"email": email}

    user_info: dict[str, str] | None = db.user.find_one(query)
    user_obj = LoginUser(user_info) if user_info else None

    return user_obj
