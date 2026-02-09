"""Commands for loading annotations, transcripts and samples to the database."""

import gzip
import logging
from os import getenv
from pathlib import Path
from typing import TextIO

import click
from flask import json

from gens.cli.util.load_case import load_case_config
from gens.cli.util.load_helpers import load_annotations_data, load_sample_annotation_data, load_sample_data
from gens.cli.util.util import ChoiceType, db_setup, resolve_existing_path
from gens.config import settings
from gens.crud.annotations import (
    register_data_update,
)

from gens.crud.transcripts import create_transcripts
from gens.db.collections import (
    CHROMSIZES_COLLECTION,
    TRANSCRIPTS_COLLECTION,
)
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes
from gens.load.chromosomes import build_chromosomes_obj, get_assembly_info
from gens.load.meta import parse_meta_file
from gens.load.transcripts import build_transcripts
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleSex

log_level = getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
LOG = logging.getLogger(__name__)


def open_text_or_gzip(file_path: str) -> TextIO:
    """Click callback to allow reading both text and gzipped files"""
    if file_path.endswith(".gz"):
        return gzip.open(file_path, "rt", encoding="utf-8")

    return open(file_path, "r", encoding="utf-8")


@click.group()
def load() -> None:
    """Load information into Gens database"""


@load.command()
@click.option("-i", "--sample-id", type=str, required=True, help="Sample id")
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
@click.option(
    "-a",
    "--baf",
    required=True,
    type=click.Path(exists=True),
    help="File or directory of annotation files to load into the database",
)
@click.option(
    "-c",
    "--coverage",
    required=True,
    type=click.Path(exists=True),
    help="File or directory of annotation files to load into the database",
)
@click.option(
    "-n",
    "--case-id",
    required=True,
    help="Id of case",
)
@click.option(
    "--meta",
    "meta_files",
    type=click.Path(exists=True, path_type=Path),
    multiple=True,
    help="TSV file with sample metadata",
)
@click.option(
    "-t",
    "--sample-type",
    type=str,
    required=False,
    help="Type of the sample (for instance, tumor/normal, proband/mother/father/relative, other)",
)
@click.option(
    "--sex",
    type=ChoiceType(SampleSex),
    required=False,
    help="Sex of the sample",
)
def sample(
    sample_id: str,
    genome_build: GenomeBuild,
    baf: Path,
    coverage: Path,
    case_id: str,
    meta_files: tuple[Path, ...],
    sample_type: str | None,
    sex: SampleSex | None,
) -> None:
    """Load a sample into Gens database."""
    load_sample_data(
        sample_id=sample_id,
        genome_build=genome_build,
        baf=baf,
        coverage=coverage,
        case_id=case_id,
        meta_files=list(meta_files),
        sample_type=sample_type,
        sex=sex,
    )
    click.secho("Finished adding a new sample to database ✔", fg="green")


@load.command("case")
@click.argument("config_file", type=click.Path(exists=True, path_type=Path))
def case(config_file: Path) -> None:
    """Load a full case from YAML including samples, metadata and annotation tracks."""
    case_config = load_case_config(config_file)
    base_dir = config_file.parent

    shared_meta_files = [
        resolve_existing_path(path, base_dir, "Meta file")
        for path in case_config.meta_files
    ]

    for sample_config in case_config.samples:
        sample_meta_files = [
            resolve_existing_path(
                path,
                base_dir,
                f'Meta file for sample "{sample_config.sample_id}"',
            )
            for path in sample_config.meta_files
        ]
        if sample_config.overview_json is not None:
            LOG.warning(
                'Ignoring deprecated "overview_json" for sample "%s"',
                sample_config.sample_id,
            )

        load_sample_data(
            sample_id=sample_config.sample_id,
            genome_build=case_config.genome_build,
            baf=resolve_existing_path(
                sample_config.baf, base_dir, f'BAF file for "{sample_config.sample_id}"'
            ),
            coverage=resolve_existing_path(
                sample_config.coverage,
                base_dir,
                f'Coverage file for "{sample_config.sample_id}"',
            ),
            case_id=case_config.case_id,
            meta_files=[*shared_meta_files, *sample_meta_files],
            sample_type=sample_config.sample_type,
            sex=sample_config.sex,
        )

        for sample_annot in sample_config.sample_annotations:
            load_sample_annotation_data(
                sample_id=sample_config.sample_id,
                case_id=case_config.case_id,
                genome_build=case_config.genome_build,
                file=resolve_existing_path(
                    sample_annot.file,
                    base_dir,
                    f'Sample annotation file for "{sample_config.sample_id}"',
                ),
                name=sample_annot.name,
            )

    click.secho(
        (
            f'Finished loading case "{case_config.case_id}" '
            f'with {len(case_config.samples)} sample(s)'
        ),
        fg="green",
    )


@load.command("sample-annotation")
@click.option("--sample-id", required=True, help="Sample ID")
@click.option("--case-id", required=True, help="Case ID")
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
@click.option("--file", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--name", required=True, help="Name of the annotation track")
def sample_annotation(
    sample_id: str,
    case_id: str,
    genome_build: GenomeBuild,
    file: Path,
    name: str,
) -> None:
    """Load a sample annotation into Gens database."""
    load_sample_annotation_data(
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
        file=file,
        name=name,
    )
    click.secho("Finished loading sample annotations ✔", fg="green")


@load.command()
@click.option(
    "-f",
    "--file",
    required=True,
    type=click.Path(exists=True, path_type=Path),
    help="File or directory of annotation files to load into the database",
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
    "--tsv",
    "is_tsv",
    is_flag=True,
    help="Force parsing as tsv regardless of suffix.",
)
# FIXME: Make this more general to work with all file formats
@click.option(
    "-i",
    "--ignore-errors",
    "ignore_errors",
    is_flag=True,
    help="Proceed with parsing AED files even if some entries fail.",
)
def annotations(
    file: Path, genome_build: GenomeBuild, is_tsv: bool, ignore_errors: bool
) -> None:
    """Load annotations from file into the database."""
    load_annotations_data(LOG, file, genome_build, is_tsv, ignore_errors)
    click.secho("Finished loading annotations ✔", fg="green")


@load.command()
@click.option(
    "-f",
    "--file",
    required=True,
    help="GTF transcript file (.gtf or .gtf.gz)",
)
@click.option(
    "-m",
    "--mane",
    required=True,
    help="Mane summary file (.txt or .txt.gz)",
)
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
def transcripts(file: str, mane: str, genome_build: GenomeBuild) -> None:
    """Load transcripts into the database."""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError(
            "No Gens database name provided in settings (settings.gens_db.database)"
        )
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    # if collection is not indexed, create index
    if len(get_indexes(db, TRANSCRIPTS_COLLECTION)) == 0:
        create_index(db, TRANSCRIPTS_COLLECTION)
    LOG.info("Building transcript object")
    with open_text_or_gzip(file) as file_fh, open_text_or_gzip(mane) as mane_fh:
        transcripts_obj = build_transcripts(file_fh, mane_fh, genome_build)
        LOG.info("Validating transcript format")

    # FIXME build transcripts
    create_transcripts(transcripts_obj, db)
    click.secho("Finished loading transcripts ✔", fg="green")


@load.command()
@click.option(
    "-b",
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    required=True,
    help="Genome build",
)
@click.option(
    "-f",
    "--file",
    type=click.Path(exists=True, path_type=Path),
    required=False,
    default=None,
    help="JSON file with assembly info (optional)",
)
@click.option(
    "-t",
    "--timeout",
    type=int,
    default=10,
    help="Timeout for queries when downloading",
)
def chromosomes(genome_build: GenomeBuild, file: Path | None, timeout: int) -> None:
    """Load chromosome size information into the database."""

    db = db_setup([CHROMSIZES_COLLECTION])

    # Get chromosome info from ensemble
    # If file is given, use sizes from file else download chromsizes from ebi
    if file is not None:
        LOG.info("File is provided, loading from file")
        with open_text_or_gzip(str(file)) as fh:
            assembly_info = json.load(fh)
    else:
        LOG.info("Retrieving online")
        assembly_info = get_assembly_info(genome_build, timeout=timeout)

    chrom_data = {
        elem["name"]: elem
        for elem in assembly_info["top_level_region"]
        if elem.get("coord_system") == "chromosome"
    }

    chrom_data = {chrom: chrom_data[chrom] for chrom in assembly_info["karyotype"]}

    try:
        LOG.info(f"Build chromosome object for build {genome_build}")
        chromosomes_data = build_chromosomes_obj(chrom_data, genome_build, timeout)
    except Exception as err:
        raise click.UsageError(str(err))

    # remove old entries
    res = db[CHROMSIZES_COLLECTION].delete_many({"genome_build": int(genome_build)})
    LOG.info(
        "Removed %d old entries with genome build: %s", res.deleted_count, genome_build
    )
    # insert collection
    LOG.info("Add chromosome info to database")
    db[CHROMSIZES_COLLECTION].insert_many(
        [chr.model_dump() for chr in chromosomes_data]
    )
    register_data_update(db, CHROMSIZES_COLLECTION)
    # build cytogenetic data
    click.secho("Finished updating chromosome sizes ✔", fg="green")
