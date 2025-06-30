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
from typing import Iterable, Optional, TextIO

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


def main(sample_id: str, coverage: Path, gvcf: Path, gnomad: Path, out_dir: Path) -> None:

    out_dir.mkdir(parents=True, exist_ok=True)

    cov_output = out_dir / f"{sample_id}.cov.bed"
    baf_output = out_dir / f"{sample_id}.baf.bed"

    # print("Calculating coverage data", file=sys.stderr)
    # with open(cov_output, "w", encoding="utf-8") as covout:
    #     for win_size, prefix in zip(COV_WINDOW_SIZES, PREFIXES):
    #         generate_cov_bed(coverage, win_size, prefix, covout)

    print("Calculating BAFs from gvcf...", file=sys.stderr)
    tmp_baf = f"{sample_id}.baf.tmp"
    with open(tmp_baf, "w", encoding="utf-8") as tmpout:
        parse_gvcfvaf(gvcf, gnomad, tmpout)

    with open(baf_output, "w", encoding="utf-8") as bafout:
        for skip_n, prefix in zip(BAF_SKIP_N, PREFIXES):
            print(f"Outputting BAF {prefix}...", file=sys.stderr)
            generate_baf_bed(tmp_baf, skip_n, prefix, bafout)

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


def gvcf_region(line: str) -> Region:
    cols = line.rstrip().split("\t")
    match = re.search(r"(?:^|;)END=(.*?)(?:;|$)", cols[7])
    end = int(match.group(1)) if match else int(cols[1])
    return Region(
        cols[0],
        int(cols[1]),
        end
    )


def chr_less(chr1: str, chr2: str) -> bool:
    return CHR_ORDER_MAP.get(chr1, 1e9) < CHR_ORDER_MAP.get(chr2, 1e9)



def chr_position_less(chr1: str, pos1: int, chr2: str, pos2: int) -> bool:
    if chr1 == chr2:
        return pos1 < pos2
    return chr_less(chr1, chr2)


def parse_gvcfvaf(gvcf_file: Path, gnomad_file: Path, out_fh: TextIO) -> None:

    with gzip.open(gvcf_file, "rt") as gvcf_fh, open(gnomad_file) as gnomad_fh:
        for line in gvcf_fh:
            if not line.startswith("#"):
                gvcf_line = line
                break
        else:
            sys.exit("GVCF file contained no entries")

        gvcf_pos: Optional[Region] = gvcf_region(gvcf_line)
        gvcf_count = 0
        match_count = 0

        for entry in gnomad_fh:
            chrom, pos_str = entry.rstrip().split("\t")
            pos = int(pos_str)
            while True:
                if not chr_position_less(gvcf_pos.chrom, int(gvcf_pos.start), chrom, pos):
                    break
                line = gvcf_fh.readline()
                if not line:
                    gvcf_pos = None
                    break
                gvcf_line = line
                gvcf_pos = gvcf_region(gvcf_line)
                gvcf_count += 1

            if gvcf_pos is None:
                break
            if chrom == gvcf_pos.chrom and pos == int(gvcf_pos.start):
                entry = GVCFEntry(gvcf_line)

                if entry.is_indel():
                    continue

                if not entry.pass_depth_filter(10):
                    continue

                if "AD" not in entry.sample_entries:
                    baf_freq = 0
                else:
                    parsed_baf = entry.parse_b_allele_freq()
                    if parsed_baf is None:
                        continue
                    baf_freq = parsed_baf

                print(f"{chrom}\t{pos}\t{baf_freq}", file=out_fh)
                match_count += 1
        skipped = gvcf_count - match_count
        print(f"{skipped} variants skipped!", file=sys.stderr)

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
    

    def is_indel(self):
        return len(self.ref) > 1

    def pass_depth_filter(self, depth_filter: int) -> bool:
        depth = self.sample_entries.get("DP")
        if not depth:
            return False
        return int(depth) >= depth_filter

    def parse_b_allele_freq(self) -> Optional[float]:

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
            # print("Is this ever triggered?")
            alt_count = max(allele_depths[1:])
        
        dp = int(self.sample_entries["DP"])
        b_allele_freq = alt_count / dp
        return b_allele_freq


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
