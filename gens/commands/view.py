"""View information stored in the database."""

import logging
from itertools import groupby
from typing import Any, Iterable

import click
from flask import current_app as app
from flask.cli import with_appcontext
from tabulate import tabulate

from gens.db import get_samples

LOG = logging.getLogger(__name__)


@click.group()
def view():
    """View information loaded into Gens database"""


@view.command()
@click.option("-s", "--summary", is_flag=True, help="Summarize the number of samples")
@with_appcontext
def samples(summary: bool):
    """View samples stored in the database"""
    db = app.config["GENS_DB"]
    # print samples to terminal
    samples_in_db, _ = get_samples(db)
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
