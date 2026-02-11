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
        force=False,
    )

    user_doc = db.get_collection(USER_COLLECTION).find_one({"name": "Mixed Case"})
    assert user_doc is not None
    assert user_doc["email"] == "mixed.case@example.com"


def test_create_user_cli_requires_force_for_existing_user(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "First", "email": "user@example.com"}
    )

    with pytest.raises(click.ClickException, match="already exists"):
        cli_users.create_user_cmd.callback(
            email="user@example.com",
            name="Second",
            force=False,
        )


def test_create_user_cli_force_updates_existing_user(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "First", "email": "user@example.com"}
    )

    cli_users.create_user_cmd.callback(
        email="user@example.com",
        name="Updated Name",
        force=True,
    )

    user_doc = db.get_collection(USER_COLLECTION).find_one({"email": "user@example.com"})
    assert user_doc is not None
    assert user_doc["name"] == "Updated Name"


def test_delete_user_cli_removes_user(
    cli_users: ModuleType, db: mongomock.Database
) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "Delete Me", "email": "delete.me@example.com"}
    )

    cli_users.delete_user_cmd.callback(
        email="delete.me@example.com",
        force=True,
    )

    assert db.get_collection(USER_COLLECTION).count_documents({}) == 0


def test_delete_user_cli_raises_for_missing_user(cli_users: ModuleType) -> None:
    with pytest.raises(click.ClickException, match="not found"):
        cli_users.delete_user_cmd.callback(
            email="missing@example.com",
            force=True,
        )


def test_list_users_cli_prints_rows(
    cli_users: ModuleType, db: mongomock.Database, capsys: pytest.CaptureFixture[str]
) -> None:
    users_collection = db.get_collection(USER_COLLECTION)
    users_collection.insert_many(
        [
            {"name": "Alpha", "email": "alpha@example.com"},
            {"name": "Beta", "email": "beta@example.com"},
        ]
    )

    cli_users.list_users.callback()

    output = capsys.readouterr().out
    assert "email\tname" in output
    assert "alpha@example.com\tAlpha" in output
    assert "beta@example.com\tBeta" in output
