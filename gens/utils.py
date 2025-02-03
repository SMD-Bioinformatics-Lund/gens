"""Utility functions."""

import datetime

def get_timestamp() -> datetime.datetime:
    """Get datetime timestamp in utc timezone."""
    return datetime.datetime.now(tz=datetime.UTC)