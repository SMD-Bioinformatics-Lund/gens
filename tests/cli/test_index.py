import logging
from types import ModuleType
import mongomock

from gens.db.index import INDEXES

LOG = logging.getLogger(__name__)

def _index_name(model) -> str:
    name = model.document.get("name")
    if name:
        return name
    return "_".join(f"{field}_{order}" for field, order in model.document["key"])


def test_index_creates_indexes(cli_index: ModuleType, db: mongomock.Database):
    """Ensure that the index command builds all indexes."""
    
    cli_index.index.callback(build=True, update=False)

    for collection_name, models in INDEXES.items():
        info = db.get_collection(collection_name).index_information()
        for model in models:
            assert _index_name(model) in info


def test_index_updates_indexes(cli_index: ModuleType, db: mongomock.Database):
    """Ensure missing indexes are created when running update."""

    # Create first index for each collection
    for collection_name, models in INDEXES.items():
        db.get_collection(collection_name).create_indexes(models[1:])

    cli_index.index.callback(build=False, update=True)

    for collection_name, models in INDEXES.items():
        info = db.get_collection(collection_name).index_information()
        for model in models:
            assert _index_name(model) in info


