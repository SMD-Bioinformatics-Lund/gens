#!/usr/bin/env python3

import argparse
from collections import defaultdict
import gzip
from pathlib import Path
from typing import Dict, List, TextIO
import logging

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)

description = """
Generates inputs for Gens v4+

* Parses ROH output and UPD output into a single bed file
* Calculates overal ROH %
* Calculates average chromosome coverage
* Summarizes various UPD / ROH metrics
"""

VERSION = "1.1.0"

AUTO_CHROMS = [str(i) for i in range(1, 23)]
SEX_CHROMS = ["X", "Y"]
CHROMS = AUTO_CHROMS + SEX_CHROMS


def main(
    roh_path: Path,
    upd_regions_path: Path,
    upd_sites_path: Path,
    cov_path: Path,
    chrom_length_path: Path,
    sample: str,
    sex: str,
    roh_quality_threshold: float,
    cov_diff_threshold: float,
    color_roh: str,
    color_upd_maternal: str,
    color_upd_paternal: str,
    out_gens_track_roh: Path,
    out_gens_track_upd: Path,
    out_chrom_meta: Path,
    out_meta: Path,
):
    LOG.info("Starting up")

    LOG.info("Parsing chromosomes")
    chrom_lengths: Dict[str, int] = parse_chrom_lengths(chrom_length_path)
    total_chrom_length = sum(chrom_lengths.values())
    LOG.info("Parsing ROH")
    roh_entries: List[RohEntry] = parse_roh(roh_path, sample, roh_quality_threshold)
    LOG.info("Parsing UPD")
    upd_entries: List[UPDEntry] = parse_upd(upd_regions_path)
    LOG.info("Parsing UPD sites")
    upd_site_info: Dict[str, Dict[str, str]] = parse_upd_sites(upd_sites_path)
    LOG.info("Parsing coverage")
    avg_cov_entries: List[ChromCovEntry] = parse_cov(cov_path, cov_diff_threshold, sex)

    tot_roh_length = sum(
        [entry.get_length() for entry in roh_entries if entry.chrom in AUTO_CHROMS]
    )
    roh_perc = float(tot_roh_length) / float(total_chrom_length) * 100

    LOG.info("Writing global meta to %s", str(out_gens_track_roh))
    with open_file(out_gens_track_roh, "w") as out_fh:
        for entry in roh_entries:
            print("\t".join(entry.get_bed_fields(color_roh)), file=out_fh)

    with open_file(out_gens_track_upd, "w") as out_fh:
        for entry in upd_entries:
            if entry.origin == "PATERNAL":
                color = color_upd_paternal
            elif entry.origin == "MATERNAL":
                color = color_upd_maternal
            else:
                raise ValueError(
                    f"The entry.origin of '{entry.origin}' is not expected, expected PATERNAL or MATERNAL"
                )
            print("\t".join(entry.get_bed_fields(color)), file=out_fh)

    LOG.info("Writing per-chromosome meta to %s", str(out_chrom_meta))
    with open_file(out_chrom_meta, "w") as out_fh:

        print("\t".join(["Chromosome", "type", "value", "color"]), file=out_fh)
        for chrom_cov in avg_cov_entries:
            label = "Estimated chromosomal copy numbers"
            print(f"{chrom_cov.chrom}\t{label}\t{chrom_cov.cov}\t{chrom_cov.color}", file=out_fh)

        upd_labels = [
            # "Chromosome",
            "Total SNPs",
            "Non-informative",
            "Mismatch father",
            "Mismatch mother",
            "Anti-UPD",
        ]
        for chrom in CHROMS:
            for upd_label in upd_labels:
                field_value = upd_site_info[chrom].get(upd_label, 0)
                print(f"{chrom}\t{upd_label}\t{field_value}\trgb(0,0,0)", file=out_fh)

    LOG.info("Writing sample-wide meta to %s", str(out_meta))
    with open_file(out_meta, "w") as out_fh:
        print("\t".join(["type", "value"]), file=out_fh)
        print("\t".join(["%ROH", str(roh_perc)]), file=out_fh)


class RohEntry:
    def __init__(self, line):
        line = line.rstrip()
        fields = line.split("\t")
        self.sample = fields[1]
        self.chrom = fields[2]
        self.start = int(fields[3])
        self.end = int(fields[4])
        self.length = float(fields[5])
        self.nbr_markers = float(fields[6])
        self.quality = float(fields[7])

    def get_length(self) -> int:
        return self.end - self.start

    def get_bed_fields(self, color: str) -> List[str]:
        return [self.chrom, str(self.start), str(self.end), "ROH", ".", ".", ".", ".", color]


class UPDEntry:
    def __init__(self, line):
        line = line.rstrip()
        fields = line.split("\t")
        self.chrom = fields[0]
        self.start = int(fields[1])
        self.end = int(fields[2])
        details_str = fields[3]

        details = {}
        for entry in details_str.split(";"):
            key, value = entry.split("=")
            details[key] = value
        self.details = details
        self.origin = details["ORIGIN"]

    def get_length(self) -> int:
        return self.end - self.start

    def get_bed_fields(self, color: str) -> List[str]:
        return [
            self.chrom,
            str(self.start),
            str(self.end),
            f"UPD ({self.origin})",
            ".",
            ".",
            ".",
            ".",
            color,
        ]


class CovEntry:
    def __init__(self, line):
        line = line.rstrip()
        fields = line.split("\t")
        self.chrom = fields[0]
        self.start = int(fields[1])
        self.end = int(fields[2])
        self.cn = float(fields[3])

    def get_length(self) -> int:
        return self.end - self.start


class ChromCovEntry:
    def __init__(self, chrom: str, cov: float, color: str):
        self.chrom = chrom
        self.cov = cov
        self.color = color


def parse_upd_sites(upd_sites: Path) -> Dict[str, Dict[str, str]]:

    sum_per_chrom: Dict[str, int] = {}
    sum_chrom_type: Dict[str, Dict[str, int]] = {}

    for chrom in CHROMS:
        sum_per_chrom[chrom] = 0
        sum_chrom_type[chrom] = {}

    with open_file(upd_sites, "r") as in_fh:
        for line in in_fh:
            line = line.rstrip()
            fields = line.split("\t")
            chrom = fields[0]
            upd_type = fields[3]

            sum_per_chrom[chrom] += 1

            if sum_chrom_type[chrom].get(upd_type) is None:
                sum_chrom_type[chrom][upd_type] = 0

            sum_chrom_type[chrom][upd_type] += 1

    out_fields: Dict[str, Dict[str, str]] = defaultdict(dict)
    for chrom in CHROMS:
        chrom_tot = sum_per_chrom[chrom]
        chrom_types: Dict[str, int] = sum_chrom_type[chrom]

        paternal_origin = chrom_types.get("UPD_PATERNAL_ORIGIN") or 0
        paternal_origin_perc = round(100 * paternal_origin / chrom_tot, 1) if chrom_tot > 0 else 0
        maternal_origin = chrom_types.get("UPD_MATERNAL_ORIGIN") or 0
        maternal_origin_perc = round(100 * maternal_origin / chrom_tot, 1) if chrom_tot > 0 else 0
        anti = chrom_types.get("ANTI_UPD") or 0
        anti_perc = round(100 * anti / chrom_tot, 1) if chrom_tot > 0 else 0
        non_informative = paternal_origin + maternal_origin + anti
        non_informative_perc = round(100 * non_informative / chrom_tot, 1) if chrom_tot > 0 else 0

        chrom_info: Dict[str, str] = {
            "Total SNPs": str(chrom_tot),
            "Non-informative": f"{non_informative} ({non_informative_perc}%)",
            "Mismatch mother": f"{paternal_origin} ({paternal_origin_perc}%)",
            "Mismatch father": f"{maternal_origin} ({maternal_origin_perc}%)",
            "Anti-UPD": f"{anti} ({anti_perc}%)",
        }

        out_fields[chrom] = chrom_info

    return out_fields


def parse_chrom_lengths(chrom_lengths_path: Path) -> Dict[str, int]:
    chrom_lengths = {}
    with open(chrom_lengths_path, "r") as in_fh:
        for line in in_fh:
            line = line.rstrip()
            if not line.startswith("@SQ"):
                continue
            fields = line.split("\t")
            chrom = fields[1].split(":")[1]
            length = fields[2].split(":")[1]
            if chrom in AUTO_CHROMS:
                chrom_lengths[chrom] = int(length)
    return chrom_lengths


def parse_cov(cov: Path, cov_diff_thres: float, sex: str) -> List[ChromCovEntry]:
    cov_sums = {}
    with open_file(cov, "r") as cov_fh:
        for line in cov_fh:
            if line.startswith("@") or line.startswith("CONTIG"):
                continue
            cov_entry = CovEntry(line)
            if cov_sums.get(cov_entry.chrom) is None:
                cov_sums[cov_entry.chrom] = {"nval": 0, "acc": 0, "sum_cov": 0, "sum_length": 0}

            cov_sums[cov_entry.chrom]["nval"] += 1
            cov_sums[cov_entry.chrom]["acc"] += cov_entry.cn

    avg_covs = {}
    for chrom, sums in cov_sums.items():
        avg_covs[chrom] = sums["acc"] / sums["nval"]

    scaled_covs = []
    for chrom in CHROMS:

        color = "rgb(0,0,0)"
        chrom_count = 1 if sex == "M" and chrom in SEX_CHROMS else 2
        # Calculate the full value
        cn_val = chrom_count * 2 ** avg_covs.get(chrom, 0)
        if abs(cn_val - chrom_count) > cov_diff_thres:
            color = "rgb(255,0,0)"

        scaled_covs.append(ChromCovEntry(chrom, round(cn_val, 2), color))

    return scaled_covs


def parse_roh(roh_path: Path, sample: str, qual_thres: float) -> List[RohEntry]:

    roh_entries_per_chrom: List[RohEntry] = []
    with open_file(roh_path, "r") as roh_fh:
        for line in roh_fh:
            if line.startswith("#") or line.startswith("ST"):
                continue
            line = line.rstrip()
            fields = line.split("\t")
            # There is no quality information available
            if len(fields) < 7:
                continue
            roh_entry = RohEntry(line)
            if roh_entry.sample == sample and roh_entry.quality >= qual_thres:
                roh_entries_per_chrom.append(roh_entry)
    return roh_entries_per_chrom


def parse_upd(upd: Path) -> List[UPDEntry]:

    upd_entries: List[UPDEntry] = []
    with open_file(upd, "r") as upd_fh:
        for line in upd_fh:
            upd_entry = UPDEntry(line)
            upd_entries.append(upd_entry)
    return upd_entries


def open_file(path: Path, read_or_write: str) -> TextIO:

    if read_or_write == "w":
        path.parent.mkdir(parents=True, exist_ok=True)

    if path.suffix == ".gz":
        if read_or_write == "r":
            return gzip.open(path, "rt")
        elif read_or_write == "w":
            return gzip.open(path, "wt")
        else:
            raise ValueError(f"Unknown read_or_write value: {read_or_write}, expected r or w")
    else:
        if read_or_write == "r":
            return path.open("r")
        elif read_or_write == "w":
            return path.open("w")
        raise ValueError(f"Unknown read_or_write value: {read_or_write}, expected r or w")


def parse_arguments():
    parser = argparse.ArgumentParser(description=description)

    parser.add_argument("-v", "--version", action="version", version=VERSION)

    parser.add_argument(
        "--roh", required=True, type=Path, help="ROH output as provided by the bcftools command roh"
    )
    parser.add_argument(
        "--upd_regions",
        required=True,
        type=Path,
        help="UPD regions output from: https://github.com/bjhall/upd",
    )
    parser.add_argument(
        "--upd_sites",
        required=True,
        type=Path,
        help="UPD sites output from: https://github.com/bjhall/upd",
    )
    parser.add_argument(
        "--cov",
        required=True,
        type=Path,
        help="Copy ratio output from GATK's CollectReadCounts+DenoiseReadCounts",
    )
    parser.add_argument(
        "--chrom_lengths",
        required=True,
        type=Path,
        help=".dict file generated by calculating FASTA sequences lengths using samtools faidx and Picard's CreateSequenceDictionary",
    )

    parser.add_argument(
        "--sample",
        required=True,
        type=str,
        help="Sample ID used to filter out proband-only rows from ROH input",
    )
    parser.add_argument(
        "--sex",
        required=True,
        type=str,
        help="Sex information (M / F) used to scale copy ratio to chromosome level for sex chromosomes",
    )

    parser.add_argument(
        "--roh_quality_threshold",
        default=85,
        type=float,
        help="Only entries with quality threshold above this in --roh are considered",
    )
    parser.add_argument(
        "--cov_diff_threshold",
        default=0.1,
        type=float,
        help="Chromosome coverage values differing more than this are colored in red in output data",
    )
    parser.add_argument("--color_roh", default="rgb(255,186,60)", help="Color for ROH in track")
    parser.add_argument(
        "--color_upd_maternal", default="rgb(255,75,75)", help="Color for maternal UPD in track"
    )
    parser.add_argument(
        "--color_upd_paternal", default="rgb(75,75,255)", help="Color for paternal UPD in track"
    )

    parser.add_argument(
        "--out_gens_track_roh", required=True, type=Path, help="Bed ranges with ROH information"
    )
    parser.add_argument(
        "--out_gens_track_upd", required=True, type=Path, help="Bed ranges with UPD information"
    )
    parser.add_argument(
        "--out_meta", required=True, type=Path, help="Output global meta info (i.e. ROH%)"
    )
    parser.add_argument(
        "--out_chrom_meta",
        required=True,
        type=Path,
        help="Writes per-chromosome information about coverage and UPD details",
    )

    args = parser.parse_args()

    if not args.sex in {"M", "F"}:
        raise ValueError("--sex must be either 'M' or 'F'")

    return args


if __name__ == "__main__":
    args = parse_arguments()
    main(
        args.roh,
        args.upd_regions,
        args.upd_sites,
        args.cov,
        args.chrom_lengths,
        args.sample,
        args.sex,
        args.roh_quality_threshold,
        args.cov_diff_threshold,
        args.color_roh,
        args.color_upd_maternal,
        args.color_upd_paternal,
        args.out_gens_track_roh,
        args.out_gens_track_upd,
        args.out_chrom_meta,
        args.out_meta,
    )
