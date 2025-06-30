#!/usr/bin/env python3
"""Generate Gens coverage and BAF data files."""

from __future__ import annotations

import argparse
import gzip
import os
import re
import sys
import statistics
import subprocess
from pathlib import Path
from typing import Optional, TextIO

DESCRIPTION = """
Generate Gens BAF and coverage data

BAF: Given a set of predefined coordinates (i.e. common variants in Gnomad). Look through a gVCF.
For SNVs in those positions, check the alternative allele frequency.

Coverage: Given a per-range coverage file. Given certain window sizes, calculate the average coverage within 
these larger ranges.

Both yields bed files on different levels of resolutions.

Resolutions for coverage files are calculated by using different window sizes.

Resolution for BAF files are calculated by sub-sampling the BAF.
"""

VERSION = "1.0.0"

CHR_ORDER = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "X",
    "Y",
    "MT",
]
CHR_ORDER_MAP = {c: i for i, c in enumerate(CHR_ORDER)}

COV_WINDOW_SIZES = [100000, 25000, 5000, 1000, 100]
BAF_SKIP_N = [160, 40, 10, 4, 1]
PREFIXES = ["o", "a", "b", "c", "d"]
BAF_MIN_DEPTH = 10


def main(label: str, coverage: Path, gvcf: Path, gnomad: Path, out_dir: Path) -> None:

    out_dir.mkdir(parents=True, exist_ok=True)

    cov_output = out_dir / f"{label}.cov.bed"
    baf_output = out_dir / f"{label}.baf.bed"

    print("Calculating coverage data", file=sys.stderr)
    with open(cov_output, "w", encoding="utf-8") as covout:
        for win_size, prefix in zip(COV_WINDOW_SIZES, PREFIXES):
            generate_cov_bed(coverage, win_size, prefix, covout)

    print("Calculating BAFs from gvcf...", file=sys.stderr)
    tmp_baf = out_dir / f"{label}.baf.tmp"
    with open(tmp_baf, "w", encoding="utf-8") as tmpout:
        parse_gvcfvaf(gvcf, gnomad, tmpout, BAF_MIN_DEPTH)

    with open(baf_output, "w", encoding="utf-8") as bafout:
        for skip_n, prefix in zip(BAF_SKIP_N, PREFIXES):
            print(f"Outputting BAF {prefix}...", file=sys.stderr)
            generate_baf_bed(str(tmp_baf), skip_n, prefix, bafout)

    subprocess.run(["bgzip", "-f", "-@10", str(baf_output)], check=True)
    subprocess.run(["tabix", "-f", "-p", "bed", str(baf_output) + ".gz"], check=True)
    subprocess.run(["bgzip", "-f", "-@10", str(cov_output)], check=True)
    subprocess.run(["tabix", "-f", "-p", "bed", str(cov_output) + ".gz"], check=True)
    os.unlink(tmp_baf)


def generate_baf_bed(fn: str, skip: int, prefix: str, out_fh: TextIO) -> None:
    """Write a downsampled BAF bed file."""
    with open(fn, "r", encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            if i % skip == 0:
                parts = line.rstrip().split("\t")
                if len(parts) != 3:
                    continue
                chrom, pos, val = parts
                out_fh.write(f"{prefix}_{chrom}\t{int(pos) - 1}\t{pos}\t{val}\n")


def generate_cov_bed(cov_file: Path, win_size: int, prefix: str, out_fh: TextIO) -> None:
    """Convert standardized coverage to Gens bed format."""
    active_region = None
    force_end = False
    reg_ratios: list[float] = []

    with open(cov_file, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("@") or line.startswith("CONTIG"):
                continue

            chrom, start_str, end_str, ratio_str = line.rstrip().split("\t")
            curr = Region(chrom, int(start_str), int(end_str))
            orig_end = curr.end
            curr_ratio = float(ratio_str)

            if not active_region:
                active_region = Region(curr.chrom, curr.start, curr.end)

            # Check if still within the target window size
            if chrom == active_region.chrom and curr.start - active_region.end < win_size:
                reg_ratios.append(curr_ratio)
                active_region.end = curr.end
            else:
                # If not, then finish the current window
                force_end = True
                curr.end = active_region.end

            curr_window_size = curr.end - active_region.start + 1
            if curr_window_size >= win_size or force_end:
                mid_point = active_region.start + (curr.end - active_region.start) // 2
                out_fh.write(
                    f"{prefix}_{active_region.chrom}\t{mid_point - 1}\t{mid_point}\t{statistics.mean(reg_ratios)}\n"
                )
                active_region = None
                reg_ratios = []

            if force_end:
                active_region = Region(chrom, curr.start, orig_end)
                reg_ratios.append(curr_ratio)
                force_end = False


def parse_gvcfvaf(gvcf_file: Path, gnomad_file: Path, out_fh: TextIO, depth_threshold: int) -> None:
    """
    Calculate BAF frequencies for provided gnomad file positions
    Write position and BAF frequencies to file
    
    Considerations:
    - Skip indels
    - If no alt-allele depth (AD) assigned (i.e. no call), set frequency 0
    - If having AD reads but less than threshold, skip
    """

    gnomad_positions = set()
    with open(gnomad_file, "r") as gnomad_fh:
        for line in gnomad_fh:
            line = line.rstrip()
            chrom, pos = line.split("\t")
            pos_key = f"{chrom}_{pos}"
            gnomad_positions.add(pos_key)

    with gzip.open(gvcf_file, "rt") as gvcf_fh:

        gvcf_count = 0
        match_count = 0

        for gvcf_line in gvcf_fh:
            if gvcf_line.startswith("#"):
                continue

            gvcf_count += 1
            gvcf_pos: Region = gvcf_region(gvcf_line)
            position_key = f"{gvcf_pos.chrom}_{gvcf_pos.start}"
            if position_key not in gnomad_positions:
                continue

            entry = GVCFEntry(gvcf_line)
            if len(entry.ref) > 1:
                continue

            if "AD" not in entry.sample_entries:
                baf_freq = 0
            elif not entry.pass_depth_filter(depth_threshold):
                continue
            else:
                parsed_baf = entry.parse_b_allele_freq()
                if parsed_baf is None:
                    continue
                baf_freq = parsed_baf

            print(f"{gvcf_pos.chrom}\t{gvcf_pos.start}\t{baf_freq}", file=out_fh)
            match_count += 1

        skipped = gvcf_count - match_count
        print(f"{skipped} variants skipped!", file=sys.stderr)


def gvcf_region(line: str) -> Region:
    """Return END from info column if present. Else, return the start position."""
    cols = line.rstrip().split("\t")
    match = re.search(r"(?:^|;)END=(.*?)(?:;|$)", cols[7])
    end = int(match.group(1)) if match else int(cols[1])
    return Region(cols[0], int(cols[1]), end)


class Region:
    def __init__(self, chr: str, start: int, end: int):
        self.chrom = chr
        self.start = start
        self.end = end


class GVCFEntry:
    def __init__(self, line: str):
        cols = line.split("\t")

        self.chrom = cols[0]
        self.start = int(cols[1])
        self.ref = cols[3]
        self.alt_alleles = cols[4].split(",")
        self.info_str = cols[7]
        sample_keys = cols[8].split(":")
        sample_vals = cols[9].split(":")
        self.sample_entries = dict(zip(sample_keys, sample_vals))

    def pass_depth_filter(self, depth_filter: int) -> bool:
        depth = self.sample_entries.get("DP")
        if not depth:
            return False
        if int(depth) >= depth_filter:
            return True
        else:
            return False

    def parse_b_allele_freq(self) -> Optional[float]:
        """
        If the alt allele is non-SNV (i.e. several inserted bases), return None
        Otherwise return alt allele count / allele depth
        """

        gt = self.sample_entries["GT"]
        _ref_str, alt_str = gt.replace("|", "/").split("/")
        alt = int(alt_str)

        allele_depths = [int(d) for d in self.sample_entries["AD"].split(",")]
        if alt != 0:
            if alt > len(self.alt_alleles):
                return None
            alt_allele_length = len(self.alt_alleles[alt - 1])
            if alt_allele_length > 1:
                return None
            alt_count = allele_depths[alt]
        else:
            alt_count = max(allele_depths[1:])

        dp = int(self.sample_entries["DP"])
        b_allele_freq = alt_count / dp
        return b_allele_freq

    def __str__(self) -> str:
        return f"{self.chrom} {self.start} {self.ref} {",".join(self.alt_alleles)}"


def parse_arguments():
    parser = argparse.ArgumentParser(description=DESCRIPTION)
    parser.add_argument("-v", "--version", action="version", version=VERSION)

    parser.add_argument("--label", help="Output label", required=True)
    parser.add_argument("--coverage", help="Standardized coverage file", required=True, type=Path)
    parser.add_argument("--gvcf", help="gVCF file", required=True, type=Path)
    parser.add_argument("--gnomad", help="File with gnomAD SNP positions", required=True, type=Path)
    
    parser.add_argument("--outdir", help="Output dir", required=True, type=Path)
    args = parser.parse_args()
    return args


if __name__ == "__main__":
    args = parse_arguments()

    main(args.label, args.coverage, args.gvcf, args.gnomad, args.outdir)
