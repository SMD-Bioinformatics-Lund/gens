#!/usr/bin/env python3
"""Generate Gens coverage and BAF data files."""

from __future__ import annotations

import argparse
import os
import sys
import statistics
import subprocess
from pathlib import Path
from typing import Iterable, TextIO

from gvcfvaf import gvcfvaf_main

COV_WINDOW_SIZES = [100000, 25000, 5000, 1000, 100]
BAF_SKIP_N = [160, 40, 10, 4, 1]
PREFIXES = ["o", "a", "b", "c", "d"]


def main(sample_id: str, coverage: Path, gvcf: Path, gnomad: Path, out_dir: Path) -> None:

    out_dir.mkdir(parents=True, exist_ok=True)

    cov_output = out_dir / f"{sample_id}.cov.bed"
    baf_output = out_dir / f"{sample_id}.baf.bed"

    print("Calculating coverage data", file=sys.stderr)
    with open(cov_output, "w", encoding="utf-8") as covout:
        for win_size, prefix in zip(COV_WINDOW_SIZES, PREFIXES):
            generate_cov_bed(coverage, win_size, prefix, covout)

    # print("Calculating BAFs from gvcf...", file=sys.stderr)
    # tmp_baf = f"{sample_id}.baf.tmp"
    # with open(tmp_baf, "w", encoding="utf-8") as tmpout:
    #     gvcfvaf_main(gvcf, gnomad, baf_output)

    # with open(baf_output, "w", encoding="utf-8") as bafout:
    #     for skip_n, prefix in zip(BAF_SKIP_N, PREFIXES):
    #         print(f"Outputting BAF {prefix}...", file=sys.stderr)
    #         generate_baf_bed(tmp_baf, skip_n, prefix, bafout)

    # subprocess.run(["bgzip", "-f", "-@10", str(baf_output)], check=True)
    # subprocess.run(["tabix", "-f", "-p", "bed", str(baf_output) + ".gz"], check=True)
    # subprocess.run(["bgzip", "-f", "-@10", str(cov_output)], check=True)
    # subprocess.run(["tabix", "-f", "-p", "bed", str(cov_output) + ".gz"], check=True)
    # os.unlink(tmp_baf)


def mean(values: Iterable[float]) -> float:
    """Return the mean of an iterable of floats."""
    seq = list(values)
    return statistics.fmean(seq) if seq else 0.0


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


class Region:
    def __init__(self, chr: str, start: int, end: int):
        self.chrom = chr
        self.start = start
        self.end = end


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

            # Are we still within the target window size?
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
                    f"{prefix}_{active_region.chrom}\t{mid_point - 1}\t{mid_point}\t{mean(reg_ratios)}\n"
                )
                active_region = None
                reg_ratios = []

            if force_end:
                active_region = Region(chrom, curr.start, orig_end)
                reg_ratios.append(curr_ratio)
                force_end = False


def parse_arguments():
    parser = argparse.ArgumentParser(description="Generate Gens BAF and coverage data")
    parser.add_argument("--coverage", help="Standardized coverage file", required=True, type=Path)
    parser.add_argument("--gvcf", help="Input gVCF file", required=True, type=Path)
    parser.add_argument("--sample_id", help="Sample identifier", required=True)
    parser.add_argument("--gnomad", help="File with gnomAD SNP positions", required=True, type=Path)
    parser.add_argument("--outdir", help="Output dir", required=True, type=Path)
    args = parser.parse_args()
    return args


if __name__ == "__main__":
    args = parse_arguments()

    main(args.sample_id, args.coverage, args.gvcf, args.gnomad, args.outdir)
