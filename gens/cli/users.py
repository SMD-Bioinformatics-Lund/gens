"""CLI commands for managing users."""

from __future__ import annotations

from typing import Any

import click
from pymongo.collection import Collection

from gens.cli.util import db as cli_db
from gens.crud.user import create_user, delete_user, get_user, get_users, upsert_user
from gens.db.collections import USER_COLLECTION
from gens.models.base import User


def get_user_collection() -> Collection[Any]:
    """Get the Gens user collection used by CLI user commands."""
    db = cli_db.get_cli_db()
    return db.get_collection(USER_COLLECTION)


@click.group()
def users() -> None:
    """Manage users in the Gens user collection."""


@users.command("list")
def list_users() -> None:
    """List users."""
    collection = get_user_collection()
    users_data = sorted(get_users(collection), key=lambda user: str(user.email))
    if not users_data:
        click.echo("No users found.")
        return

    click.echo("email\tname")
    for user_obj in users_data:
        click.echo(f"{user_obj.email}\t{user_obj.name}")


@users.command("show")
@click.option("--email", required=True, help="User email")
def show_user(email: str) -> None:
    """Show one user by email."""
    collection = get_user_collection()
    user_obj = get_user(collection, email)
    if user_obj is None:
        raise click.ClickException(f"User '{email}' not found")

    click.echo(f"Email: {user_obj.email}")
    click.echo(f"Name: {user_obj.name}")


@users.command("create")
@click.option("--email", required=True, help="User email")
@click.option("--name", required=True, help="Display name")
@click.option("--force", is_flag=True, help="Replace existing user if already present")
def create_user_cmd(email: str, name: str, force: bool) -> None:
    """Create a user."""
    collection = get_user_collection()
    existing_user = get_user(collection, email)
    if existing_user is not None and not force:
        raise click.ClickException(
            f"User '{email}' already exists. Use --force to replace."
        )

    user_obj = User(
        name=name.strip(),
        email=email.strip().lower(),
        roles=["user"],
    )

    if existing_user is not None:
        upsert_user(collection, user_obj)
        click.secho(f"Updated user {user_obj.email} ✔", fg="green")
        return

    create_user(collection, user_obj)
    click.secho(f"Created user {user_obj.email} ✔", fg="green")


@users.command("delete")
@click.option("--email", required=True, help="User email")
@click.option("--force", is_flag=True, help="Delete without confirmation prompt")
def delete_user_cmd(email: str, force: bool) -> None:
    """Delete a user by email."""
    if not force and not click.confirm(f"Delete user '{email}'?", default=False):
        click.echo("Aborted")
        return

    collection = get_user_collection()
    was_deleted = delete_user(collection, email)
    if not was_deleted:
        raise click.ClickException(f"User '{email}' not found")

    click.secho(f"Deleted user {email.strip().lower()} ✔", fg="green")
