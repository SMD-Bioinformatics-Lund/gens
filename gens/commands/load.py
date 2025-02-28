"""Commands for loading annotations, transcripts and samples to the database."""

import logging
from pathlib import Path
from typing import Any, TextIO

import click
import gzip
from flask import current_app as app
from flask.cli import with_appcontext
from pymongo.database import Database

from gens.config import settings
from gens.db import (
    ANNOTATIONS_COLLECTION,
    CHROMSIZES_COLLECTION,
    SAMPLES_COLLECTION,
    TRANSCRIPTS_COLLECTION,
    create_index,
    get_db_connection,
    get_indexes,
    register_data_update,
    store_sample,
)
from gens.load import (
    build_chromosomes_obj,
    build_transcripts,
    get_assembly_info,
    parse_annotation_entry,
    read_annotation_file,
    update_height_order,
)
from gens.models.annotation import AnnotationRecord
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)


class ChoiceType(click.Choice):
    """Custom input type for click that returns genome build enum."""

    name = "genome build"

    def __init__(self, enum):
        super().__init__(list(map(str, enum)))
        self.enum = enum

    def convert(self, value: str, param, ctx):
        """Convert str to genome build"""

        value = super().convert(value, param, ctx)
        return next(v for v in self.enum if str(v) == value)


def open_text_or_gzip(file_path: str) -> TextIO:
    """Click callback to allow reading both text and gzipped files"""
    if file_path.endswith(".gz"):
        return gzip.open(file_path, "rt", encoding="utf-8")
    else:
        return open(file_path, "r", encoding="utf-8")


@click.group()
def load():
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
    "-j",
    "--overview-json",
    type=click.Path(exists=True),
    help="Json file that contains preprocessed overview coverage",
)
@click.option(
    "--force",
    is_flag=True,
    help="Overwrite any existing sample with the same key.",
)
@with_appcontext
def sample(
    sample_id: str,
    genome_build: GenomeBuild,
    baf: Path,
    coverage: Path,
    case_id: str,
    overview_json: Path,
    force: bool,
):
    """Load a sample into Gens database."""
    db: Database[Any] = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)
    # load samples
    store_sample(
        db,
        sample_id=sample_id,
        case_id=case_id,
        genome_build=genome_build,
        baf=baf,
        coverage=coverage,
        overview=overview_json,
        force=force,
    )
    click.secho("Finished adding a new sample to database ✔", fg="green")


@load.command()
@click.option(
    "-f",
    "--file",
    required=True,
    type=click.Path(exists=True),
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
    "-h",
    "--header",
    "has_header",
    is_flag=True,
    help="If bed file contains a header",
)
def annotations(file: str, genome_build: GenomeBuild, has_header: bool):
    """Load annotations from file into the database."""
    db = get_db_connection(settings.gens_db.connection, db_name=settings.gens_db.database)
    # if collection is not indexed, create index
    if len(get_indexes(db, ANNOTATIONS_COLLECTION)) == 0:
        create_index(db, ANNOTATIONS_COLLECTION)
    # check if path is a directoy of a file
    path = Path(file)
    files = path.glob("*") if path.is_dir() else [path]
    LOG.info("Processing files")
    for annot_file in files:
        # verify file format
        if annot_file.suffix not in [".bed", ".aed"]:
            continue
        LOG.info("Processing %s", annot_file)
        # base the annotation name on the filename
        annotation_name = annot_file.name[: -len(annot_file.suffix)]
        parsed_annotations: list[AnnotationRecord] = []
        for entry in read_annotation_file(
            annot_file, annot_file.suffix[1:], has_header
        ):
            entry_obj = parse_annotation_entry(entry, genome_build, annotation_name)
            if entry_obj is not None:
                parsed_annotations.append(entry_obj)

        if len(parsed_annotations) == 0:
            raise ValueError("Something went wrong parsing the annotaions file.")
        # Remove existing annotations in database
        LOG.info("Remove old entry in the database")
        db[ANNOTATIONS_COLLECTION].delete_many({"source": annotation_name})
        # add the annotations
        LOG.info("Load annoatations in the database")
        db[ANNOTATIONS_COLLECTION].insert_many([annot.model_dump() for annot in parsed_annotations])
        LOG.info("Update height order")
        # update the height order of annotations in the database
        update_height_order(db, annotation_name)
        register_data_update(
            db=db, track_type=ANNOTATIONS_COLLECTION, name=annotation_name
        )
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
@with_appcontext
def transcripts(file: str, mane: str, genome_build: GenomeBuild):
    """Load transcripts into the database."""

    db = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, TRANSCRIPTS_COLLECTION)) == 0:
        create_index(db, TRANSCRIPTS_COLLECTION)
    LOG.info("Building transcript object")
    try:
        with open_text_or_gzip(file) as file_fh, open_text_or_gzip(mane) as mane_fh:
            transcripts_obj = build_transcripts(file_fh, mane_fh, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))

    LOG.info("Add transcripts to database")
    db[TRANSCRIPTS_COLLECTION].insert_many(transcripts_obj)
    register_data_update(db, TRANSCRIPTS_COLLECTION)
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
    "-t",
    "--timeout",
    type=int,
    default=10,
    help="Timeout for queries.",
)
@with_appcontext
def chromosome_info(genome_build: GenomeBuild, timeout: int):
    """Load chromosome size information into the database."""
    db = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, CHROMSIZES_COLLECTION)) == 0:
        create_index(db, CHROMSIZES_COLLECTION)
    # get chromosome info from ensemble
    # if file is given, use sizes from file else download chromsizes from ebi
    LOG.info("Query ensembl for assembly info for %s", genome_build)
    assembly_info = get_assembly_info(genome_build, timeout=timeout)
    # index chromosome on name
    chrom_data = {
        elem["name"]: elem
        for elem in assembly_info["top_level_region"]
        if elem.get("coord_system") == "chromosome"
    }
    chrom_data = {chrom: chrom_data[chrom] for chrom in assembly_info["karyotype"]}
    try:
        LOG.info("Build chromosome object")
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
    db[CHROMSIZES_COLLECTION].insert_many([chr.model_dump() for chr in chromosomes_data])
    register_data_update(db, CHROMSIZES_COLLECTION)
    # build cytogenetic data
    click.secho("Finished updating chromosome sizes ✔", fg="green")
