"""Create indexes in the database."""

import logging
from typing import Any

from pymongo import ASCENDING, IndexModel
from pymongo.database import Database

from .annotation import ANNOTATIONS, TRANSCRIPTS
from .chrom_sizes import CHROMSIZES
from .samples import COLLECTION as SAMPLES

LOG = logging.getLogger(__name__)

INDEXES = {
    ANNOTATIONS: [
        IndexModel(
            [("chrom", ASCENDING), ("start", ASCENDING), ("end", ASCENDING)],
            name="genome_position",
            background=True,
        ),
        IndexModel(
            [("chrom", ASCENDING), ("source", ASCENDING)],
            name="chrom_source",
            background=True,
        ),
        IndexModel(
            [("source", ASCENDING)],
            name="source",
            background=True,
        ),
        IndexModel(
            [("height_order", ASCENDING)],
            name="height_order",
            background=True,
        ),
        IndexModel(
            [("genome_build", ASCENDING)],
            name="genome_build",
            background=True,
        ),
    ],
    TRANSCRIPTS: [
        IndexModel(
            [("chrom", ASCENDING), ("start", ASCENDING), ("end", ASCENDING)],
            name="genome_position",
            background=True,
        ),
        IndexModel(
            [("height_order", ASCENDING)],
            name="height_order",
            background=True,
        ),
        IndexModel(
            [("genome_build", ASCENDING)],
            name="genome_build",
            background=True,
        ),
    ],
    CHROMSIZES: [
        IndexModel(
            [("genome_build", ASCENDING)],
            name="genome_build",
            background=True,
        ),
    ],
    SAMPLES: [
        IndexModel(
            [("sample_id", ASCENDING), ("genome_build", ASCENDING)],
            name="sample__sample_id_genome_build",
            background=True,
        ),
        IndexModel(
            [("case_id", ASCENDING), ("genome_build", ASCENDING)],
            name="case__case_id_genome_build",
            background=True,
        ),
        IndexModel(
            [
                ("sample_id", ASCENDING),
                ("case_id", ASCENDING),
                ("genome_build", ASCENDING),
            ],
            name="sample__sample_id_case_id_genome_build",
            background=True,
            unique=True,
        ),
        IndexModel(
            [("created_at", ASCENDING)],
            name="sample__creation_date",
            background=True,
        ),
    ],
}


def get_indexes(db: Database, target_collection_name: str) -> list[str]:
    """Get current indexes for a collection."""
    indexes: list[str] = []
    for collection_name in db.list_collection_names():
        if target_collection_name and target_collection_name != collection_name:
            continue
        for index_name in db[collection_name].index_information():
            if index_name != "_id_":
                indexes.append(index_name)
    return indexes


def create_index(db: Database, collection_name: str) -> None:
    """Create indexes for collection in Gens db."""
    indexes = INDEXES[collection_name]
    existing_indexes = get_indexes(db, collection_name)
    # Drop old indexes
    for index in indexes:
        index_name = index.document.get("name")
        if index_name in existing_indexes:
            LOG.info("Removing old index: %s", index_name)
            db[collection_name].drop_index(index_name)
    # Create new indexes
    names = ", ".join([str(i.document.get("name")) for i in indexes])
    LOG.info("Creating indexes %s for collection: %s", names, collection_name)
    db[collection_name].create_indexes(indexes)


def create_indexes(db: Database) -> None:
    """Create indexes for Gens db."""
    LOG.info("Indexing the gens database.")
    for collection_name in INDEXES:
        create_index(db, collection_name)


def update_indexes(db: Database) -> int:
    """Add missing indexes to the database."""
    LOG.info("Updating gens database indexes.")
    n_updated = 0
    for collection_name, indexes in INDEXES.items():
        existing_indexes = get_indexes(db, collection_name)
        for index in indexes:
            index_name = index.document.get("name")
            if index_name not in existing_indexes:
                LOG.info("Creating index : %s", index_name)
                db[collection_name].create_indexes([index])
                n_updated += 1
    LOG.info("Updated %d indexes to the database", n_updated)
    return n_updated
