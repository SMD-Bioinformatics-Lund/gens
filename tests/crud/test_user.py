import mongomock

from gens.crud.user import create_user, get_user, get_users
from gens.db.collections import USER_COLLECTION
from gens.models.base import User


def test_get_user_matches_email_case_insensitive(db: mongomock.Database) -> None:
    user_collection = db.get_collection(USER_COLLECTION)
    user_collection.insert_one(
        {"name": "Case User", "email": "Case.User@Example.com", "roles": ["user"]}
    )

    user_obj = get_user(user_collection, "case.user@example.com")

    assert user_obj is not None
    assert user_obj.name == "Case User"


def test_get_user_returns_none_for_invalid_document(db: mongomock.Database) -> None:
    user_collection = db.get_collection(USER_COLLECTION)
    user_collection.insert_one({"name": "Broken", "email": "broken@example.com"})

    assert get_user(user_collection, "broken@example.com") is None


def test_get_users_skips_invalid_documents(db: mongomock.Database) -> None:
    user_collection = db.get_collection(USER_COLLECTION)
    user_collection.insert_many(
        [
            {"name": "Valid", "email": "valid@example.com", "roles": ["user"]},
            {"name": "Broken", "email": "broken@example.com"},
        ]
    )

    users = get_users(user_collection)

    assert len(users) == 1
    assert users[0].name == "Valid"


def test_create_user_normalizes_email_to_lowercase(db: mongomock.Database) -> None:
    user_collection = db.get_collection(USER_COLLECTION)
    user_obj = User(name="Test User", email="Mixed.Case@Example.com", roles=["user"])

    create_user(user_collection, user_obj)

    inserted = user_collection.find_one({"name": "Test User"})
    assert inserted is not None
    assert inserted["email"] == "mixed.case@example.com"
