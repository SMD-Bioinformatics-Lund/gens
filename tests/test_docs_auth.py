from __future__ import annotations

import pytest

pytest.importorskip("authlib.integrations.flask_client")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient

from gens.app import create_app
from gens.config import AuthMethod


def test_docs_redirects_to_login_when_auth_is_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("gens.app.settings.authentication", AuthMethod.SIMPLE)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/docs", follow_redirects=False)

    assert response.status_code in (302, 307)
    assert response.headers["location"].startswith("/landing?next=/api/docs")


def test_openapi_requires_auth_when_auth_is_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("gens.app.settings.authentication", AuthMethod.SIMPLE)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/openapi.json")

    assert response.status_code == 401


def test_docs_is_open_when_auth_is_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("gens.app.settings.authentication", AuthMethod.DISABLED)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/docs")

    assert response.status_code == 200
    assert "swagger-ui" in response.text


def test_api_root_no_slash_returns_welcome_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("gens.app.settings.authentication", AuthMethod.SIMPLE)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api")

    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to Gens API"
    assert "version" in response.json()


def test_api_root_with_trailing_slash_returns_welcome_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("gens.app.settings.authentication", AuthMethod.SIMPLE)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/")

    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to Gens API"
    assert "version" in response.json()


def test_api_root_is_open_when_auth_is_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("gens.app.settings.authentication", AuthMethod.DISABLED)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/")

    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to Gens API"
