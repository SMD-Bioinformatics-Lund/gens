"""Defenition of custom error pages"""

import logging
from typing import Any

from flask import render_template

LOG = logging.getLogger(__name__)


def sample_not_found(error: Any) -> tuple[str, int]:
    """Resource not found."""
    sample_id = error.sample_id

    return (
        render_template(
            "sample_not_found.html",
            sample_id=sample_id,
        ),
        404,
    )


def generic_exception_error(error: Any) -> tuple[str, int]:
    """Resource not found."""
    return (
        render_template(
            "generic_exception_error.html",
            error_type=type(error).__name__,
            message=error.args,
        ),
        404,
    )


def generic_abort_error(error: Any) -> tuple[str, int]:
    """Internal server error page."""
    return (
        render_template(
            "generic_abort_error.html",
            error_code=error.code,
            error_desc=error.description,
        ),
        error.code,
    )
