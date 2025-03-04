#!/usr/bin/env python3

import argparse
from dataclasses import dataclass
import logging
from pathlib import Path
import re
import subprocess


LOG = logging.getLogger("quick_setup")
logging.basicConfig(level=logging.INFO)


"""Quickly setup the database"""


def main(samples_dir: Path, annotations: Path):

    print("test")

    LOG.info("Samples dir: %s", samples_dir)
    samples = find_samples(samples_dir)
    LOG.info("Found %s samples", len(samples))

    # coverage = "/tmp/hg002/hg002.cov.bed.gz"
    # baf = "/tmp/hg002/hg002.baf.bed.gz"
    # overview = "/tmp/hg002/hg002.overview.json.gz"
    # subprocess.run(
    #     [
    #         "gens",
    #         "load",
    #         "sample",
    #         "--sample-id",
    #         "hg002",
    #         "--case-id",
    #         "hg002-case",
    #         "--coverage",
    #         coverage,
    #         "--baf",
    #         baf,
    #         "--overview-json",
    #         overview,
    #         "--genome-build",
    #         "38",
    #     ],
    #     check=True,
    # )


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
            sample = SampleSet(file_id, file_id, cov_file, cov_tbi, baf, baf_tbi, overview)
            samples.append(sample)
    return samples


def parse_arguments():
    parser = argparse.ArgumentParser(description="Load data into MongoDB from dump folder.")
    parser.add_argument(
        "--samples", type=str, help="The folder containing the dump files.", required=True
    )
    parser.add_argument(
        "--annotations", type=str, help="The folder containing the annotations.", required=True
    )
    args = parser.parse_args()
    return args


if __name__ == "__main__":
    args = parse_arguments()
    main(Path(args.samples), Path(args.annotations))
