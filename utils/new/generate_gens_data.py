#!/usr/bin/env python3
"""Generate Gens coverage and BAF data files."""

from __future__ import annotations

import argparse
import os
import statistics
import subprocess
from pathlib import Path
from typing import Iterable, TextIO

COV_WINDOW_SIZES = [100000, 25000, 5000, 1000, 100]
BAF_SKIP_N = [160, 40, 10, 4, 1]
PREFIXES = ["o", "a", "b", "c", "d"]


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


def generate_cov_bed(fn: str, win_size: int, prefix: str, out_fh: TextIO) -> None:
    """Convert standardized coverage to Gens bed format."""
    reg_start = None
    reg_end = None
    reg_chr = None
    force_end = False
    reg_ratios: list[float] = []

    with open(fn, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("@") or line.startswith("CONTIG"):
                continue
            chr_, start_str, end_str, ratio_str = line.rstrip().split("\t")
            start = int(start_str)
            end = int(end_str)
            ratio = float(ratio_str)
            orig_end = end

            if reg_start is None:
                reg_start = start
                reg_end = end
                reg_chr = chr_

            if chr_ == reg_chr:
                if start - reg_end < win_size:
                    reg_ratios.append(ratio)
                    reg_end = end
                else:
                    force_end = True
                    end = reg_end
            else:
                force_end = True
                end = reg_end

            if reg_start is not None and ((end - reg_start + 1) >= win_size or force_end):
                mid_point = reg_start + (end - reg_start) // 2
                out_fh.write(
                    f"{prefix}_{reg_chr}\t{mid_point - 1}\t{mid_point}\t{mean(reg_ratios)}\n"
                )
                reg_start = reg_end = reg_chr = None
                reg_ratios = []

            if force_end:
                reg_start = start
                reg_end = orig_end
                reg_chr = chr_
                reg_ratios.append(ratio)
                force_end = False


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Gens BAF and coverage data")
    parser.add_argument("coverage", help="Standardized coverage file")
    parser.add_argument("gvcf", help="Input gVCF file")
    parser.add_argument("sample_id", help="Sample identifier")
    parser.add_argument("gnomad", help="File with gnomAD SNP positions")
    args = parser.parse_args()

    cov_output = f"{args.sample_id}.cov.bed"
    baf_output = f"{args.sample_id}.baf.bed"
    script_root = Path(__file__).resolve().parent

    print("Calculating coverage data", file=os.sys.stderr)
    with open(cov_output, "w", encoding="utf-8") as covout:
        for win_size, prefix in zip(COV_WINDOW_SIZES, PREFIXES):
            generate_cov_bed(args.coverage, win_size, prefix, covout)

    print("Calculating BAFs from gvcf...", file=os.sys.stderr)
    tmp_baf = f"{args.sample_id}.baf.tmp"
    with open(tmp_baf, "w", encoding="utf-8") as tmpout:
        subprocess.run([
            str(script_root / "gvcfvaf.pl"),
            args.gvcf,
            args.gnomad,
        ], stdout=tmpout, check=True)

    with open(baf_output, "w", encoding="utf-8") as bafout:
        for skip_n, prefix in zip(BAF_SKIP_N, PREFIXES):
            print(f"Outputting BAF {prefix}...", file=os.sys.stderr)
            generate_baf_bed(tmp_baf, skip_n, prefix, bafout)

    subprocess.run(["bgzip", "-f", "-@10", baf_output], check=True)
    subprocess.run(["tabix", "-f", "-p", "bed", baf_output + ".gz"], check=True)
    subprocess.run(["bgzip", "-f", "-@10", cov_output], check=True)
    subprocess.run(["tabix", "-f", "-p", "bed", cov_output + ".gz"], check=True)
    os.unlink(tmp_baf)


if __name__ == "__main__":
    main()
