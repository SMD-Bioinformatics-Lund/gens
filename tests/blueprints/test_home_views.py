from __future__ import annotations

from flask import Flask

from gens.blueprints.home.views import home_bp


def _build_app() -> Flask:
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(home_bp)
    return app
