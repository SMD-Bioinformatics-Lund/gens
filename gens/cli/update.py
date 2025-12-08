"""CLI commands for updating entries in the database."""

import logging
from os import getenv
from pathlib import Path

import click

from gens.cli.util.util import ChoiceType, db_setup, normalize_sample_type
from gens.crud.samples import get_sample, update_sample
from gens.db.collections import (
    SAMPLES_COLLECTION,
)
from gens.load.meta import parse_meta_file
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleSex

log_level = getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
LOG = logging.getLogger(__name__)


@click.group()
def update() -> None:
    """Update information in Gens database"""


@update.command()
@click.option("-i", "--sample-id", required=True, help="Sample id")
@click.option(
    "-n",
    "--case-id",
    required=True,
    help="Id of case",
)
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
@click.option(
    "-t",
    "--sample-type",
    type=str,
    help="New sample type (for instance, tumor/normal, proband/mother/father/relative, other)",
)
@click.option(
    "--sex",
    type=ChoiceType(SampleSex),
    required=False,
    help="Update sample sex",
)
@click.option(
    "--baf",
    type=click.Path(exists=True, path_type=Path),
    required=False,
    help="Update BAF file",
)
@click.option(
    "--coverage",
    type=click.Path(exists=True, path_type=Path),
    required=False,
    help="Update coverage file",
)
@click.option(
    "--meta",
    "meta_file",
    type=click.Path(exists=True, path_type=Path),
    help="TSV file with sample metadata",
)
@click.option(
    "--force",
    is_flag=True,
    help="Overwrite existing meta without asking for confirmation",
)
def sample(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild,
    sample_type: str | None,
    sex: SampleSex | None,
    baf: Path | None,
    coverage: Path | None,
    meta_file: Path,
    force: bool,
) -> None:
    """Update sample information for a sample."""

    db = db_setup([SAMPLES_COLLECTION])

    sample_obj = get_sample(
        db[SAMPLES_COLLECTION],
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
    )

    if sample_type is not None:
        sample_obj.sample_type = (
            normalize_sample_type(sample_type) if sample_type else None
        )
    if sex is not None:
        sample_obj.sex = sex
    if coverage is not None:
        sample_obj.coverage_file = coverage
    if baf is not None:
        sample_obj.baf_file = baf

    if meta_file:
        meta_results = parse_meta_file(meta_file)

        existing_file_names = [meta.file_name for meta in sample_obj.meta]

        if meta_results.file_name in existing_file_names:
            click.echo(f"Meta data {meta_results.file_name} already exists on sample")
            if not force:
                if not click.confirm("Proceed with update?", default=False):
                    click.echo("Aborted")
                    return

        # Overwrite existing meta with the same name
        sample_obj.meta = [
            meta_entry
            for meta_entry in sample_obj.meta
            if meta_entry.file_name != meta_results.file_name
        ]
        sample_obj.meta.append(meta_results)

    update_sample(db, sample_obj)
    click.secho("Finished updating sample ✔", fg="green")
