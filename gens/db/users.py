"""Retrieve users from scout db"""

from typing import Optional

from flask import current_app as app
from flask_login import UserMixin


class LoginUser(UserMixin):
    def __init__(self, user_data: dict[str, str]):
        """Create a new user object."""
        self.roles = []
        for key, value in user_data.items():
            setattr(self, key, value)

    # FIXME: Type does not work correctly here. Solved by mongo data types?
    def get_id(self) -> str:
        return self.email

    @property
    def is_admin(self):
        """Check if the user is admin."""
        return "admin" in self.roles


def user(email: str) -> LoginUser | None:
    db = app.config["SCOUT_DB"]

    query = {}
    query["email"] = email

    user_dict = db.user.find_one(query)
    user_obj = LoginUser(user_dict) if user_dict else None

    return user_obj
