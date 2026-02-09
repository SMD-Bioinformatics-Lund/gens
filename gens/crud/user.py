"""Work with users."""

import logging
import re
from typing import Any

from pydantic import ValidationError
from pymongo.collection import Collection

from gens.models.base import User

LOG = logging.getLogger(__name__)


def get_user(user_c: Collection[Any], email: str) -> User | None:
    """Query the daatabase for a user.

    If user exist return a user object otherwise return null.
    Should be compatible with scout db as well.
    """
    normalized_email = email.strip().lower()
    user_info: dict[str, Any] | None = user_c.find_one({"email": normalized_email})
    if user_info is None:
        escaped_email = re.escape(normalized_email)
        user_info = user_c.find_one(
            {"email": {"$regex": f"^{escaped_email}$", "$options": "i"}}
        )

    if user_info is None:
        return None
    try:
        return User.model_validate(user_info)
    except ValidationError as error:
        LOG.warning(
            "Unable to validate user document for %s: %s", normalized_email, error
        )
        return None


def get_users(user_c: Collection[Any]) -> list[User]:
    """Query the daatabase for all users."""
    cursor = user_c.find()
    users: list[User] = []
    for user_info in cursor:
        try:
            users.append(User.model_validate(user_info))
        except ValidationError as error:
            user_id = user_info.get("email", user_info.get("_id", "<unknown>"))
            LOG.warning("Skipping invalid user %s: %s", user_id, error)
    return users


def create_user(user_c: Collection[Any], user_obj: User):
    """Create a new user in the user database."""
    payload = user_obj.model_dump()
    payload["email"] = str(user_obj.email).lower()
    user_c.insert_one(payload)


def upsert_user(user_c: Collection[Any], user_obj: User) -> None:
    """Create or replace a user in the user database."""
    payload = user_obj.model_dump()
    normalized_email = str(user_obj.email).lower()
    payload["email"] = normalized_email
    escaped_email = re.escape(normalized_email)
    user_c.replace_one(
        {"email": {"$regex": f"^{escaped_email}$", "$options": "i"}},
        payload,
        upsert=True,
    )


def delete_user(user_c: Collection[Any], email: str) -> bool:
    """Delete a user by email. Returns True if a user was deleted."""
    normalized_email = email.strip().lower()
    escaped_email = re.escape(normalized_email)
    deleted_count = user_c.delete_one(
        {"email": {"$regex": f"^{escaped_email}$", "$options": "i"}}
    ).deleted_count
    return deleted_count > 0
