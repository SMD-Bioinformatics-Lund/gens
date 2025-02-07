"""Initiate cachig for app."""

import tempfile

from flask_caching import Cache

tmp_dir = tempfile.TemporaryDirectory(prefix="gens_cache_")
cache = Cache(config={"CACHE_TYPE": "FileSystemCache", "CACHE_DIR": tmp_dir.name})
