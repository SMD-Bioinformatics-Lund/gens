"""Commands for loading annotations, transcripts and samples to the database."""

import gzip
import logging
from pathlib import Path
from typing import Any, TextIO

import click
from flask import json
from pymongo.database import Database

from gens.cli.util.util import ChoiceType, db_setup, normalize_sample_type
from gens.cli.util.annotations import upsert_annotation_track, parse_raw_records
from gens.config import settings
from gens.crud.annotations import (
    create_annotations_for_track,
    delete_annotation_track,
    delete_annotations_for_track,
    register_data_update,
    update_annotation_track,
)
from gens.crud.sample_annotations import (
    create_sample_annotation_track,
    create_sample_annotations_for_track,
    delete_sample_annotations_for_track,
    get_sample_annotation_track,
)
from gens.crud.samples import create_sample
from gens.crud.transcripts import create_transcripts
from gens.db.collections import (
    ANNOTATIONS_COLLECTION,
    CHROMSIZES_COLLECTION,
    SAMPLE_ANNOTATION_TRACKS_COLLECTION,
    SAMPLE_ANNOTATIONS_COLLECTION,
    SAMPLES_COLLECTION,
    TRANSCRIPTS_COLLECTION,
)
from gens.db.db import get_db_connection
from gens.db.index import create_index, get_indexes
from gens.load.annotations import (
    fmt_bed_to_annotation,
    parse_bed_file,
)
from gens.load.chromosomes import build_chromosomes_obj, get_assembly_info
from gens.load.meta import parse_meta_file
from gens.load.transcripts import build_transcripts
from gens.models.annotation import AnnotationRecord, AnnotationTrack, TranscriptRecord
from gens.models.genomic import GenomeBuild
from gens.models.sample import SampleInfo, SampleSex
from gens.models.sample_annotation import SampleAnnotationRecord, SampleAnnotationTrack

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
    overview_json: Path,
    meta_files: tuple[Path, ...],
    sample_type: str | None,
    sex: SampleSex | None,
) -> None:
    """Load a sample into Gens database."""
    gens_db_name = settings.gens_db.database
    if gens_db_name is None:
        raise ValueError("No Gens database name provided in settings (settings.gens_db.database)")
    db = get_db_connection(settings.gens_db.connection, db_name=gens_db_name)
    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)
    # load samples
    sample_obj = SampleInfo.model_validate(
        {
            "sample_id": sample_id,
            "case_id": case_id,
            "genome_build": genome_build,
            "baf_file": baf,
            "coverage_file": coverage,
            "overview_file": overview_json,
            "sample_type": normalize_sample_type(sample_type) if sample_type else None,
            "sex": sex,
            "meta": [parse_meta_file(p) for p in meta_files],
        }
    )
    create_sample(db, sample_obj)
    click.secho("Finished adding a new sample to database ✔", fg="green")


@load.command("sample-annotation")
@click.option("--sample-id", required=True, help="Sample ID")
@click.option("--case-id", required=True, help="Case ID")
@click.option("--genome-build", type=ChoiceType(GenomeBuild), required=True, help="Genome build")
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

    db = db_setup([SAMPLE_ANNOTATION_TRACKS_COLLECTION, SAMPLE_ANNOTATIONS_COLLECTION])

    track_in_db = get_sample_annotation_track(
        genome_build=genome_build,
        db=db,
        sample_id=sample_id,
        case_id=case_id,
        name=name,
    )
    if track_in_db is None:
        track = SampleAnnotationTrack(
            sample_id=sample_id,
            case_id=case_id,
            name=name,
            description="",
            genome_build=genome_build,
        )
        track_id = create_sample_annotation_track(track, db)
    else:
        track_id = track_in_db.track_id

    bed_records = parse_bed_file(file)
    annotations = [
        SampleAnnotationRecord.model_validate(
            {
                **fmt_bed_to_annotation(rec, track_id, genome_build).model_dump(),
                "sample_id": sample_id,
                "case_id": case_id,
            }
        )
        for rec in bed_records
    ]

    if track_in_db is not None:
        delete_sample_annotations_for_track(track_id, db)

    create_sample_annotations_for_track(annotations, db)
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
def annotations(file: Path, genome_build: GenomeBuild, is_tsv: bool, ignore_errors: bool) -> None:
    """Load annotations from file into the database."""

    db = db_setup([ANNOTATIONS_COLLECTION])

    files = file.glob("*") if file.is_dir() else [file]

    for annot_file in files:
        if annot_file.suffix not in [".bed", ".aed", ".tsv"]:
            continue
        LOG.info("Processing %s", annot_file)

        track_result = upsert_annotation_track(db, annot_file, genome_build)

        file_format = annot_file.suffix[1:]

        try:
            parse_recs_res = parse_raw_records(
                file_format, is_tsv, annot_file, ignore_errors, track_result, genome_build
            )
        except ValueError as err:
            click.secho(
                f"An error occured when creating loading annotation: {err}",
                fg="red",
            )
            raise click.Abort()

        if len(parse_recs_res.file_meta) > 0:
            LOG.debug("Updating existing annotation track with metadata from file.")
            update_annotation_track(
                track_id=track_result.track_id, metadata=parse_recs_res.file_meta, db=db
            )

        if len(parse_recs_res.records) == 0:
            delete_annotation_track(track_result.track_id, db)  # cleanup
            raise ValueError(
                "Something went wrong parsing the annotations file, no valid annotations found."
            )

        if track_result.track_in_db is not None:
            LOG.info("Removing old entries from the database")
            if not delete_annotations_for_track(track_result.track_id, db):
                LOG.info("No annotations were removed from the database")

        LOG.info("Load annotations in the database")
        create_annotations_for_track(parse_recs_res.records, db)
        register_data_update(db, ANNOTATIONS_COLLECTION, annot_file.stem)

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
        raise ValueError("No Gens database name provided in settings (settings.gens_db.database)")
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
        LOG.info(f"File is provided, loading from file")
        with open_text_or_gzip(str(file)) as fh:
            assembly_info = json.load(fh)
    else:
        LOG.info(f"Retrieving online")
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
    LOG.info("Removed %d old entries with genome build: %s", res.deleted_count, genome_build)
    # insert collection
    LOG.info("Add chromosome info to database")
    db[CHROMSIZES_COLLECTION].insert_many([chr.model_dump() for chr in chromosomes_data])
    register_data_update(db, CHROMSIZES_COLLECTION)
    # build cytogenetic data
    click.secho("Finished updating chromosome sizes ✔", fg="green")
