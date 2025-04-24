"""Work with users."""

from typing import Any

from pymongo.collection import Collection

from gens.models.base import User


def get_user(user_c: Collection[Any], email: str) -> User | None:
    """Query the daatabase for a user.

    If user exist return a user object otherwise return null.
    Should be compatible with scout db as well.
    """
    query = {"email": email}
    user_info: dict[str, str] | None = user_c.find_one(query)
    if user_info is None:
        return None
    return User.model_validate(user_info)


def get_users(user_c: Collection[Any]) -> list[User]:
    """Query the daatabase for all users."""
    cursor = user_c.find()
    return [User.model_validate(user) for user in cursor]


def create_user(user_c: Collection[Any], user_obj: User):
    """Create a new user in the user database."""
    user_c.insert_one(user_obj.model_dump())
