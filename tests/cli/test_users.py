from __future__ import annotations

from types import ModuleType

import click
import mongomock
import pytest

from gens.db.collections import USER_COLLECTION


def test_create_user_cli_stores_normalized_email(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    cli_users.create_user_cmd.callback(
        email="Mixed.Case@Example.com",
        name="Mixed Case",
        roles=(),
        force=False,
        user_db=None,
        collection_name=None,
    )

    user_doc = db.get_collection(USER_COLLECTION).find_one({"name": "Mixed Case"})
    assert user_doc is not None
    assert user_doc["email"] == "mixed.case@example.com"
    assert user_doc["roles"] == ["user"]


def test_create_user_cli_requires_force_for_existing_user(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "First", "email": "user@example.com", "roles": ["user"]}
    )

    with pytest.raises(click.ClickException, match="already exists"):
        cli_users.create_user_cmd.callback(
            email="user@example.com",
            name="Second",
            roles=("admin",),
            force=False,
            user_db=None,
            collection_name=None,
        )


def test_create_user_cli_force_updates_existing_user(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "First", "email": "user@example.com", "roles": ["user"]}
    )

    cli_users.create_user_cmd.callback(
        email="user@example.com",
        name="Updated Name",
        roles=("admin", "admin", "user"),
        force=True,
        user_db=None,
        collection_name=None,
    )

    user_doc = db.get_collection(USER_COLLECTION).find_one({"email": "user@example.com"})
    assert user_doc is not None
    assert user_doc["name"] == "Updated Name"
    assert user_doc["roles"] == ["admin", "user"]


def test_delete_user_cli_removes_user(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "Delete Me", "email": "delete.me@example.com", "roles": ["user"]}
    )

    cli_users.delete_user_cmd.callback(
        email="delete.me@example.com",
        force=True,
        user_db=None,
        collection_name=None,
    )

    assert db.get_collection(USER_COLLECTION).count_documents({}) == 0


def test_delete_user_cli_raises_for_missing_user(cli_users: ModuleType) -> None:
    with pytest.raises(click.ClickException, match="not found"):
        cli_users.delete_user_cmd.callback(
            email="missing@example.com",
            force=True,
            user_db=None,
            collection_name=None,
        )


def test_list_users_cli_prints_rows(
    cli_users: ModuleType, db: mongomock.Database, capsys: pytest.CaptureFixture[str]
) -> None:
    users_collection = db.get_collection(USER_COLLECTION)
    users_collection.insert_many(
        [
            {"name": "Alpha", "email": "alpha@example.com", "roles": ["user"]},
            {"name": "Beta", "email": "beta@example.com", "roles": ["admin", "user"]},
        ]
    )

    cli_users.list_users.callback(user_db=None, collection_name=None)

    output = capsys.readouterr().out
    assert "email\tname\troles" in output
    assert "alpha@example.com\tAlpha\tuser" in output
    assert "beta@example.com\tBeta\tadmin,user" in output
