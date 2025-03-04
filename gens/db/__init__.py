"""Handles CRUD operations for the Gens database."""

# FIXME: Clean up this module. Is it needed at all? Most are unused, and
# would be better to import directly from the target modules
from .annotation import (
    VariantCategory,
    get_timestamps,
    query_records_in_region,
    query_variants,
    register_data_update,
)
from .chrom_sizes import get_chromosome_size
from .db import get_db_connection
from .db import init_database_connection as init_database
from .index import create_index, create_indexes, get_indexes, update_indexes
from .samples import (
    SampleNotFoundError,
    delete_sample,
    get_samples,
    query_sample,
    store_sample,
)
