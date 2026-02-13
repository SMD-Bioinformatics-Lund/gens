from __future__ import annotations

from flask import Flask

from gens.blueprints.home.views import home_bp


def _build_app() -> Flask:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(home_bp)
    return app


def test_deprecated_app_redirect_without_prefix() -> None:
    app = _build_app()
    client = app.test_client()

    response = client.get("/app")

    assert response.status_code == 308
    assert response.headers["Location"].endswith("/")


def test_deprecated_app_redirect_with_script_name_prefix() -> None:
    app = _build_app()
    client = app.test_client()

    response = client.get("/app", headers={"X-Script-Name": "/gens_dev"})

    assert response.status_code == 308
    assert response.headers["Location"].endswith("/gens_dev/")


def test_deprecated_app_redirect_with_forwarded_prefix_and_subpath() -> None:
    app = _build_app()
    client = app.test_client()

    response = client.get(
        "/app/viewer/case1?genome_build=38",
        headers={"X-Forwarded-Prefix": "/gens_dev"},
    )

    assert response.status_code == 308
    assert response.headers["Location"].endswith(
        "/gens_dev/viewer/case1?genome_build=38"
    )
