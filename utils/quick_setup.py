#!/usr/bin/env python3


import argparse
import logging
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import requests

DESCRIPTION = """
Quickly setup the database

1. Load chromosomes (requires internet connection)
2. Load transcripts (downloads MANE summary and transcripts GTF if not present in the annotations folder)
3. Load annotations (*.bed and *.aed files in the annotations folder)
4. Load samples     (matched on pattern *.cov.bed.gz and *.baf.bed.gz in the samples folder)
"""


LOG = logging.getLogger("quick_setup")
logging.basicConfig(level=logging.INFO)


def main(
    samples_dir: Path,
    annot_dir: Path,
    mane_version: float | None,
    transcripts_version: int | None,
    load_chromosomes: bool,
    genome_build: int = 38,
):
    if load_chromosomes:
        load_chr_cmd = [
            "gens",
            "load",
            "chromosomes",
            "--genome-build",
            genome_build,
        ]
        run_command(load_chr_cmd)

    if mane_version and transcripts_version:
        mane_path, transcripts_path = get_transcript_paths(
            annot_dir, mane_version, transcripts_version, genome_build
        )
        load_transcripts_cmd = [
            "gens",
            "load",
            "transcripts",
            "--file",
            str(transcripts_path),
            "--mane",
            str(mane_path),
            "-b",
            genome_build,
        ]
        run_command(load_transcripts_cmd)

    samples = find_samples(samples_dir)
    LOG.info("Found %s samples", len(samples))
    for sample in samples:
        LOG.info(f"  {sample}")
        load_sample_cmd = [
            "gens",
            "load",
            "sample",
            "--sample-id",
            sample.sample_id,
            "--case-id",
            sample.case_id,
            "--genome-build",
            genome_build,
            "--baf",
            sample.baf,
            "--coverage",
            sample.cov,
        ]
        if sample.overview:
            load_sample_cmd += ["--overview-json", sample.overview]
        run_command(load_sample_cmd)

    annotation_files = find_annotations(annot_dir)
    LOG.info("Found %s annotation files", len(annotation_files))
    for annot_file in annotation_files:
        LOG.info(f"  {annot_file}")
        load_annot_cmd = [
            "gens",
            "load",
            "annotations",
            "--file",
            annot_file,
            "--genome-build",
            genome_build,
        ]
        run_command(load_annot_cmd)


def run_command(cmd: list[str]):
    cmd_str = [str(c) for c in cmd]
    LOG.info("Executing command: %s", " ".join(cmd_str))
    result = subprocess.run(cmd_str, check=True, capture_output=True, text=True)
    LOG.info(result.stdout)
    LOG.error(result.stderr)


def get_transcript_paths(
    annot_dir: Path, mane_version: float, transcripts_version: int, genome_build: int
) -> tuple[Path, Path]:
    mane_file = f"MANE.GRCh{genome_build}.v{mane_version}.summary.txt.gz"
    transcripts_file = f"Homo_sapiens.GRCh{genome_build}.{transcripts_version}.gtf.gz"

    if not annot_dir.exists():
        annot_dir.mkdir(parents=True)

    mane_path = annot_dir / mane_file
    if not mane_path.exists():
        LOG.info("%s not found, downloading ...", mane_path)
        url = (
            f"https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_{mane_version}/"
            + mane_file
        )
        LOG.info("Attempting to GET URL: %s", url)
        response = requests.get(url)
        response.raise_for_status()
        with mane_path.open("wb") as mane_fh:
            mane_fh.write(response.content)
    else:
        LOG.info("%s exists, not downloading", mane_path)

    transcripts_path = annot_dir / transcripts_file
    if not transcripts_path.exists():
        LOG.info("%s not found, downloading ...", transcripts_path)
        url = (
            f"https://ftp.ensembl.org/pub/release-{transcripts_version}/gtf/homo_sapiens/"
            + transcripts_file
        )
        LOG.info("Attempting to GET URL: %s", url)
        response = requests.get(url)
        response.raise_for_status()
        with transcripts_path.open("wb") as tr_fh:
            tr_fh.write(response.content)
    else:
        LOG.info("%s exists, not downloading", transcripts_path)

    return (mane_path, transcripts_path)


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

    def __str__(self):
        rows = [
            f"case_id: {self.case_id}",
            f"sample_id: {self.sample_id}",
            f"cov: {self.cov}",
            f"baf: {self.baf}",
            f"overview: {self.overview}",
        ]
        return ", ".join(rows)


def find_annotations(annotations_dir: Path) -> list[Path]:
    aed_files = list(annotations_dir.glob("*.aed"))
    LOG.info("Found %s AED files in %s", len(aed_files), annotations_dir)
    bed_files = list(annotations_dir.glob("*.bed"))
    LOG.info("Found %s BED files in %s", len(bed_files), annotations_dir)

    return aed_files + bed_files


def find_samples(
    samples_dir: Path, cov_suffix: str = ".cov.bed.gz", baf_suffix: str = ".baf.bed.gz"
) -> list[SampleSet]:
    cov_pattern = re.compile(r"^(?P<id>.+)\.cov\.bed\.gz$")

    samples = []

    for cov_file in samples_dir.glob(f"*{cov_suffix}"):
        match = cov_pattern.match(cov_file.name)
        if match:
            file_id = match.group("id")
            cov_tbi = Path(str(cov_file) + ".tbi")
            if not cov_tbi.exists():
                LOG.warning("%s does not exist", cov_tbi)
                continue

            baf = samples_dir / f"{file_id}{baf_suffix}"
            if not baf.exists():
                LOG.warning("Missing BAF file %s", baf)
                continue

            baf_tbi = Path(str(baf) + ".tbi")
            if not baf_tbi.exists():
                LOG.warning("Missing BAF TBI file %s", baf_tbi)
                continue

            overview = samples_dir / f"{file_id}.overview.json.gz"

            if not overview.exists():
                LOG.info("Missing overview file %s", overview)
            sample = SampleSet(
                file_id, file_id, cov_file, cov_tbi, baf, baf_tbi, overview
            )
            samples.append(sample)
    return samples


def parse_arguments():
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument(
        "--samples_dir",
        type=str,
        help="The folder containing the dump files.",
        required=True,
    )
    parser.add_argument(
        "--annotations_dir",
        type=str,
        help="The folder containing the annotations.",
        required=True,
    )
    parser.add_argument("--build", type=int, help="Genome build.", default=38)
    parser.add_argument(
        "--mane_version",
        type=float,
        default=1.4,
        help="Attempts download if not present in --annots folder",
    )
    parser.add_argument(
        "--transcripts_version",
        type=int,
        default=113,
        help="Attempts download if not present in --annots folder",
    )
    parser.add_argument("--load_chromosomes", action="store_true")
    args = parser.parse_args()
    return args


if __name__ == "__main__":
    args = parse_arguments()
    main(
        Path(args.samples_dir),
        Path(args.annotations_dir),
        args.mane_version,
        args.transcripts_version,
        args.load_chromosomes,
        args.build,
    )
