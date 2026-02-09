from __future__ import annotations

import mongomock
import pytest
from flask import Flask

pytest.importorskip("authlib.integrations.flask_client")

from gens.auth import login_manager
from gens.blueprints.home.views import home_bp
from gens.blueprints.login import views as login_views
from gens.blueprints.login.views import login_bp
from gens.config import AuthMethod, AuthUserDb
from gens.db.collections import USER_COLLECTION


@pytest.fixture(autouse=True)
def default_auth_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(login_views.settings, "authentication", AuthMethod.DISABLED)
    monkeypatch.setattr(login_views.settings, "auth_user_db", AuthUserDb.GENS)
    monkeypatch.setattr(login_views.settings, "auth_user_collection", USER_COLLECTION)


@pytest.fixture
def app(db: mongomock.Database) -> Flask:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"
    app.config["GENS_DB"] = db
    app.config["VARIANT_DB"] = mongomock.MongoClient().get_database("variant")
    app.register_blueprint(home_bp)
    app.register_blueprint(login_bp)
    login_manager.init_app(app)
    return app


def insert_user(db: mongomock.Database, email: str) -> None:
    db.get_collection(USER_COLLECTION).insert_one(
        {"name": "Test User", "email": email, "roles": ["user"]}
    )


def test_load_user_reads_variant_db_when_configured(
    app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    variant_db = app.config["VARIANT_DB"]
    insert_user(variant_db, "scout-user@example.com")
    monkeypatch.setattr(login_views.settings, "auth_user_db", AuthUserDb.VARIANT)

    with app.app_context():
        loaded_user = login_views.load_user("scout-user@example.com")

    assert loaded_user is not None
    assert loaded_user.email == "scout-user@example.com"


def test_login_uses_variant_db_when_configured(
    app: Flask, monkeypatch: pytest.MonkeyPatch
) -> None:
    variant_db = app.config["VARIANT_DB"]
    insert_user(variant_db, "variant-login@example.com")
    monkeypatch.setattr(login_views.settings, "auth_user_db", AuthUserDb.VARIANT)

    client = app.test_client()
    response = client.post("/login", data={"email": "variant-login@example.com"})

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/home")


def test_login_rejects_unsafe_next_redirect(app: Flask) -> None:
    insert_user(app.config["GENS_DB"], "user@example.com")
    client = app.test_client()

    response = client.post(
        "/login?next=https://evil.example/steal", data={"email": "user@example.com"}
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/home")
    with client.session_transaction() as user_session:
        assert "next_url" not in user_session


def test_login_allows_internal_next_redirect(app: Flask) -> None:
    insert_user(app.config["GENS_DB"], "user@example.com")
    client = app.test_client()

    response = client.post("/login?next=/about", data={"email": "user@example.com"})

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/about")
