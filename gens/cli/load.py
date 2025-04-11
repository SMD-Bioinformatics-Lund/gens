"""Commands for loading annotations, transcripts and samples to the database."""

import gzip
import logging
from pathlib import Path
from typing import Any, TextIO

import click
from flask import current_app as app
from flask.cli import with_appcontext
from pymongo.database import Database

from gens.cli.util import ChoiceType
from gens.config import settings
from gens.crud.transcripts import create_transcripts
from gens.db.index import create_index, get_indexes
from gens.db.db import get_db_connection
from gens.crud.annotations import create_annotation_track, create_annotations_for_track, delete_annotation_track, delete_annotations_for_track, get_annotation_track_with_name, get_annotation_tracks, register_data_update, update_annotation_track
from gens.crud.samples import create_sample
from gens.models.base import PydanticObjectId
from gens.models.sample import SampleInfo
from gens.db.collections import (
    ANNOTATIONS_COLLECTION,
    CHROMSIZES_COLLECTION,
    SAMPLES_COLLECTION,
    TRANSCRIPTS_COLLECTION,
)
from gens.load import (
    build_chromosomes_obj,
    build_transcripts,
    get_assembly_info,
    parse_annotation_entry,
    read_annotation_file,
    update_height_order,
)
from gens.models.annotation import AnnotationRecord, AnnotationTrack
from gens.models.genomic import GenomeBuild
from gens.utils import get_timestamp

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
    "-j",
    "--overview-json",
    type=click.Path(exists=True),
    help="Json file that contains preprocessed overview coverage",
)
@with_appcontext
def sample(
    sample_id: str,
    genome_build: GenomeBuild,
    baf: Path,
    coverage: Path,
    case_id: str,
    overview_json: Path,
) -> None:
    """Load a sample into Gens database."""
    db: Database[Any] = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)
    # load samples
    sample_obj = SampleInfo.model_validate({
        "sample_id": sample_id, "case_id": case_id, "genome_build": genome_build, "baf_file": baf, 
        "coverage_file": coverage, "overview_file": overview_json
    })
    create_sample(db, sample_obj)
    click.secho("Finished adding a new sample to database ✔", fg="green")


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
    "-h",
    "--header",
    "has_header",
    is_flag=True,
    help="If bed file contains a header",
)
def annotations(file: Path, genome_build: GenomeBuild, has_header: bool) -> None:
    """Load annotations from file into the database."""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError(
            "No Gens database name provided in settings (settings.gens_db.database)"
        )
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    # if collection is not indexed, create index
    if len(get_indexes(db, ANNOTATIONS_COLLECTION)) == 0:
        create_index(db, ANNOTATIONS_COLLECTION)
    files = file.glob("*") if file.is_dir() else [file]
    # get annotation tracks in database

    LOG.info("Processing files")
    for annot_file in files:
        # verify file format
        if annot_file.suffix not in [".bed", ".aed"]:
            continue
        LOG.info("Processing %s", annot_file)
        # get the track name from the filename
        annotation_name = annot_file.name[: -len(annot_file.suffix)]
        track_in_db = get_annotation_track_with_name(annotation_name, genome_build, db)

        # create a new record if it has not been added to the database
        if track_in_db is None:
            track = AnnotationTrack(name=annotation_name, description="", genome_build=genome_build)
            track_id = create_annotation_track(track, db)
        else:
            track_id = track_in_db.track_id

        # parse annotations
        # TODO extract comments as description
        parsed_annotations: list[AnnotationRecord] = []
        for entry in read_annotation_file(
            annot_file, annot_file.suffix[1:], has_header
        ):
            entry_obj = parse_annotation_entry(entry, track_id)
            if entry_obj is not None:
                parsed_annotations.append(entry_obj)

        if len(parsed_annotations) == 0:
            delete_annotation_track(track_id, db)  # cleanup
            raise ValueError("Something went wrong parsing the annotaions file, no valid annotations found.")

        # remove annotations and update track if track has already been added
        if track_in_db is not None:
            # remove annotations
            LOG.info("Remove old entries from the database")
            if not delete_annotations_for_track(track_in_db.track_id, db):
                raise ValueError("No annotations were removed from the database")
            
            # update modified timestamp
            LOG.info("Update existing track the database")
            new_track_obj = track_in_db.model_copy(update={
                "modified_at": get_timestamp()
            })
            update_annotation_track(new_track_obj, db)

        LOG.info("Load annotations in the database")
        create_annotations_for_track(parsed_annotations, db)

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
def transcripts(file: str, mane: str, genome_build: GenomeBuild) -> None:
    """Load transcripts into the database."""

    db: Database = app.config["GENS_DB"]
    # if collection is not indexed, create index
    if len(get_indexes(db, TRANSCRIPTS_COLLECTION)) == 0:
        create_index(db, TRANSCRIPTS_COLLECTION)
    LOG.info("Building transcript object")
    try:
        with open_text_or_gzip(file) as file_fh, open_text_or_gzip(mane) as mane_fh:
            transcripts_obj = build_transcripts(file_fh, mane_fh, genome_build)
    except Exception as err:
        raise click.UsageError(str(err))

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
    "-t",
    "--timeout",
    type=int,
    default=10,
    help="Timeout for queries.",
)
@with_appcontext
def chromosomes(genome_build: GenomeBuild, timeout: int) -> None:
    """Load chromosome size information into the database."""
    db: Database = app.config["GENS_DB"]
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
    db[CHROMSIZES_COLLECTION].insert_many(
        [chr.model_dump() for chr in chromosomes_data]
    )
    register_data_update(db, CHROMSIZES_COLLECTION)
    # build cytogenetic data
    click.secho("Finished updating chromosome sizes ✔", fg="green")
