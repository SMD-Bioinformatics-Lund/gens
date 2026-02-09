"""CLI commands for managing users."""

from __future__ import annotations

import click

from gens.cli.util import db as cli_db
from gens.config import AuthUserDb, settings
from gens.crud.user import create_user, delete_user, get_user, get_users, upsert_user
from gens.models.base import User

USER_DB_CHOICES = [option.value for option in AuthUserDb]


def get_user_collection(
    user_db: str | None, collection_name: str | None
):  # pragma: no cover - type inferred from pymongo
    db_name = user_db or settings.auth_user_db.value
    try:
        db = cli_db.get_cli_user_db(db_name)
    except ValueError as error:
        raise click.ClickException(str(error)) from error

    resolved_collection_name = collection_name or settings.auth_user_collection
    return db.get_collection(resolved_collection_name)


def normalize_roles(roles: tuple[str, ...]) -> list[str]:
    if not roles:
        return ["user"]

    normalized_roles: list[str] = []
    for role in roles:
        normalized_role = role.strip()
        if not normalized_role:
            continue
        if normalized_role not in normalized_roles:
            normalized_roles.append(normalized_role)

    if not normalized_roles:
        return ["user"]
    return normalized_roles


@click.group()
def users() -> None:
    """Manage users in the configured authentication user database."""


@users.command("list")
@click.option(
    "--user-db",
    type=click.Choice(USER_DB_CHOICES),
    default=None,
    help="User database to target. Defaults to auth_user_db from settings.",
)
@click.option(
    "--collection",
    "collection_name",
    default=None,
    help="Collection name to target. Defaults to auth_user_collection from settings.",
)
def list_users(user_db: str | None, collection_name: str | None) -> None:
    """List users."""
    collection = get_user_collection(user_db, collection_name)
    users_data = sorted(get_users(collection), key=lambda user: str(user.email))
    if not users_data:
        click.echo("No users found.")
        return

    click.echo("email\tname\troles")
    for user_obj in users_data:
        click.echo(f"{user_obj.email}\t{user_obj.name}\t{','.join(user_obj.roles)}")


@users.command("show")
@click.option("--email", required=True, help="User email")
@click.option(
    "--user-db",
    type=click.Choice(USER_DB_CHOICES),
    default=None,
    help="User database to target. Defaults to auth_user_db from settings.",
)
@click.option(
    "--collection",
    "collection_name",
    default=None,
    help="Collection name to target. Defaults to auth_user_collection from settings.",
)
def show_user(email: str, user_db: str | None, collection_name: str | None) -> None:
    """Show one user by email."""
    collection = get_user_collection(user_db, collection_name)
    user_obj = get_user(collection, email)
    if user_obj is None:
        raise click.ClickException(f"User '{email}' not found")

    click.echo(f"Email: {user_obj.email}")
    click.echo(f"Name: {user_obj.name}")
    click.echo(f"Roles: {', '.join(user_obj.roles)}")


@users.command("create")
@click.option("--email", required=True, help="User email")
@click.option("--name", required=True, help="Display name")
@click.option(
    "--role",
    "roles",
    multiple=True,
    help="Role to assign to the user. Repeat for multiple roles.",
)
@click.option("--force", is_flag=True, help="Replace existing user if already present")
@click.option(
    "--user-db",
    type=click.Choice(USER_DB_CHOICES),
    default=None,
    help="User database to target. Defaults to auth_user_db from settings.",
)
@click.option(
    "--collection",
    "collection_name",
    default=None,
    help="Collection name to target. Defaults to auth_user_collection from settings.",
)
def create_user_cmd(
    email: str,
    name: str,
    roles: tuple[str, ...],
    force: bool,
    user_db: str | None,
    collection_name: str | None,
) -> None:
    """Create a user."""
    collection = get_user_collection(user_db, collection_name)
    existing_user = get_user(collection, email)
    if existing_user is not None and not force:
        raise click.ClickException(
            f"User '{email}' already exists. Use --force to replace."
        )

    user_obj = User(
        name=name.strip(),
        email=email.strip().lower(),
        roles=normalize_roles(roles),
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
@click.option(
    "--user-db",
    type=click.Choice(USER_DB_CHOICES),
    default=None,
    help="User database to target. Defaults to auth_user_db from settings.",
)
@click.option(
    "--collection",
    "collection_name",
    default=None,
    help="Collection name to target. Defaults to auth_user_collection from settings.",
)
def delete_user_cmd(
    email: str, force: bool, user_db: str | None, collection_name: str | None
) -> None:
    """Delete a user by email."""
    if not force and not click.confirm(f"Delete user '{email}'?", default=False):
        click.echo("Aborted")
        return

    collection = get_user_collection(user_db, collection_name)
    was_deleted = delete_user(collection, email)
    if not was_deleted:
        raise click.ClickException(f"User '{email}' not found")

    click.secho(f"Deleted user {email.strip().lower()} ✔", fg="green")
