"""View information stored in the database."""

import logging
from itertools import groupby
from typing import Any, Iterable

import click
from tabulate import tabulate

from gens.crud.samples import get_samples
from gens.db.collections import SAMPLES_COLLECTION
from gens.db.db import get_db_connection
from gens.config import settings

LOG = logging.getLogger(__name__)


@click.group()
def view() -> None:
    """View information loaded into Gens database"""


@view.command()
@click.option("-s", "--summary", is_flag=True, help="Summarize the number of samples")
def samples(summary: bool) -> None:
    """View samples stored in the database"""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError(
            "No Gens database name provided in settings (settings.gens_db.database)"
        )
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    # print samples to terminal
    samples_in_db, _ = get_samples(db[SAMPLES_COLLECTION])
    sample_tbl: Iterable[Any]
    columns: Iterable[Any]
    if summary:  # count number of samples per genome build
        columns = ("Genome build", "N samples")
        sample_tbl = (
            (gr, len(list(1 for _ in vals)))
            for gr, vals in groupby(samples_in_db, key=lambda x: x.genome_build)
        )
    else:  # show all samples
        columns = (
            "Sample Id",
            "Case Id",
            "Genome build",
            "Created at",
            "baf file",
            "cov file",
            "overview_file",
        )
        sample_tbl = (
            (
                s.sample_id,
                s.case_id,
                str(s.genome_build),
                s.created_at.isoformat(),
                s.baf_file,
                s.coverage_file,
                s.overview_file,
            )
            for s in samples_in_db
        )
    print(tabulate(sample_tbl, headers=columns))
