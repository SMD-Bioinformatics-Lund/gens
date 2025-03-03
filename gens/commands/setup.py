from dataclasses import dataclass
import logging
from pathlib import Path
import re
import click
from flask.cli import with_appcontext
from flask import current_app as app
from pymongo.database import Database

from gens.commands.util import ChoiceType
from gens.db.collections import SAMPLES_COLLECTION
from gens.db.index import create_index, get_indexes
from gens.load import transcripts
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)



@click.group()
def setup() -> None:
    """Delete information from Gens database"""


# --sample-id remove --case-id remove --genome-build 38 --baf /dump/hg002.baf.bed.gz --coverage /dump/hg002.baf.bed.gz --overview-json /dump/hg002.overview.json.gz


@setup.command()
@click.option(
    "--samples_dir",
    help="Will look for a folder containing files with the required suffixes (.baf.bed.gz, .cov.bed.gz, [.overview.json.gz]). Prefix is used as sample and case ID.",
)
@click.option(
    "--transcripts_gtf",
    help="Transcripts GTF",
)
@click.option(
    "--mane_summary",
    help="MANE summary",
)
@click.option(
    "--download_chromosome_info",
    is_flag=True,
    help="Download chromosome info",
)
@click.option(
    "--annotations_dir",
    help="Folder containing annotation files to load",
)
@click.option(
    "--genome-build",
    type=ChoiceType(GenomeBuild),
    default='38',
    help="Genome build",
)
@with_appcontext
def quick(
    samples_dir: Path,
    transcripts_gtf: Path,
    mane_summary: Path,
    download_chromosome_info: bool,
    annotations_dir: Path,
    genome_build: GenomeBuild,
) -> None:
    """Remove a sample from Gens database."""
    db: Database = app.config["GENS_DB"]

    if (
        samples_dir is None and
        transcripts_gtf is None and
        mane_summary is None and
        download_chromosome_info is None and
        annotations_dir is None
    ):
        click.secho("No arguments provided", fg="red")
        return

    # if collection is not indexed, create index
    if len(get_indexes(db, SAMPLES_COLLECTION)) == 0:
        create_index(db, SAMPLES_COLLECTION)

    if samples_dir is not None:
        LOG.info("Samples dir: %s", samples_dir)
        samples = find_samples(samples_dir)
        LOG.info("Found %s samples", len(samples))

    if transcripts_gtf is not None:

        if not transcripts_gtf.exists():
            LOG.error("Transcripts GTF file does not exist")

        if not mane_summary.exists():
            LOG.error("MANE summary file does not exist")

        if transcripts_gtf.exists() and mane_summary.exists():
            LOG.info("Run the load transcripts command")
            
            # ctx.invoke(transcripts, gtf=transcripts_gtf, mane=mane_summary, genome_build=genome_build)

            # transcripts(transcripts_gtf, mane_summary, genome_build)
            # transcripts(transcripts_gtf, mane_summary, genome_build)



    # Detect the sample files

    if download_chromosome_info:
        LOG.info("Downloading chromosome info")

    if annotations_dir is not None:
        annotations = find_annotations(annotations_dir)
        LOG.info("Found %s annotations", len(annotations))

    LOG.info("genome_build: %s", genome_build)

    click.secho("Finished? ✔", fg="green")


@dataclass
class SampleSet:
    """Store set of files related to a sample"""
    case_id: str
    sample_id: str
    cov: Path
    cov_tbi: Path
    baf: Path
    baf_tbi: Path
    overview: Path | None


def find_annotations(annotations_dir: Path) -> list[Path]:
    aed_files = list(annotations_dir.glob("*.aed"))
    LOG.info("Found %s AED files in %s", len(aed_files), annotations_dir)
    bed_files = list(annotations_dir.glob("*.bed"))
    LOG.info("Found %s BED files in %s", len(bed_files), annotations_dir)

    return aed_files + bed_files


def find_samples(samples_dir: Path) -> list[SampleSet]:
    cov_pattern = re.compile(r"^(?P<id>.+)\.cov\.bed\.gz$")

    samples = []

    for cov_file in samples_dir.glob("*.cov.gz"):
        match = cov_pattern.match(cov_file.name)
        if match:
            file_id = match.group("id")
            cov_tbi = samples_dir / f"{file_id}.cov.gz.tbi"

            if not cov_tbi.exists():
                LOG.warning("Missing TBI file for %s", file_id)
                continue

            bed = samples_dir / f"{file_id}.bed.gz"

            if not bed.exists():
                LOG.warning("Missing BED file for %s", file_id)
                continue

            bed_tbi = samples_dir / f"{file_id}.bed.gz.tbi"

            if not bed_tbi.exists():
                LOG.warning("Missing TBI file for %s", file_id)
                continue

            overview = samples_dir / f"{file_id}.overview.json.gz"

            if not overview.exists():
                LOG.info("Missing overview file for %s", file_id)
            sample = SampleSet(file_id, file_id, cov_file, cov_tbi, bed, bed_tbi, overview)
            samples.append(sample)
    return samples
