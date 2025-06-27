#!/usr/bin/env python3
"""Extract variant allele frequencies from a gzipped GVCF file.

The script expects a BGZF compressed gvcf file and a file with
chromosome and position columns (gnomAD positions). It prints the
frequency for every matching position.
"""

from __future__ import annotations

import argparse
import gzip
import re
import sys
from typing import Optional

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


def gvcfvaf_main(gvcf_file: str, gnomad: str) -> None:
    args = parse_args()

    with gzip.open(gvcf_file, "rt") as gvcf_fh:
        for line in gvcf_fh:
            if not line.startswith("#"):
                gvcf_line = line
                break
        else:
            sys.exit("GVCF file contained no entries")

        gvcf_pos: Optional[Position] = gvcf_position(gvcf_line)
        gvcf_count = 0
        match_count = 0

        with open(gnomad) as gnomad_fh:
            for entry in gnomad_fh:
                chrom, pos_s = entry.rstrip().split("\t")
                pos = int(pos_s)
                while True:
                    if chr_position_less(gvcf_pos.chrom, int(gvcf_pos.start), chrom, pos):
                        line = gvcf_fh.readline()
                        if not line:
                            gvcf_pos = None
                            break
                        gvcf_line = line
                        gvcf_pos = gvcf_position(gvcf_line)
                        gvcf_count += 1
                    else:
                        break
                if gvcf_pos is None:
                    break
                if chrom == gvcf_pos.chrom and pos == int(gvcf_pos.start):
                    parsed = parse_gvcf_entry(gvcf_line)
                    if "frq" in parsed:
                        print(f"{chrom}\t{pos}\t{parsed.get('frq', 0)}")
                    match_count += 1
            skipped = gvcf_count - match_count
            print(f"{skipped} variants skipped!", file=sys.stderr)



def chr_less(chr1: str, chr2: str) -> bool:
    return CHR_ORDER_MAP.get(chr1, 1e9) < CHR_ORDER_MAP.get(chr2, 1e9)


def chr_position_less(chr1: str, pos1: int, chr2: str, pos2: int) -> bool:
    if chr1 == chr2:
        return pos1 < pos2
    return chr_less(chr1, chr2)


class Position:
    def __init__(self, chrom: str, start: int, end: int):
        self.chrom = chrom
        self.start = start
        self.end = end

def gvcf_position(line: str) -> Position:
    cols = line.rstrip().split("\t")
    match = re.search(r"(?:^|;)END=(.*?)(?:;|$)", cols[7])
    end = int(match.group(1)) if match else int(cols[1])
    return Position(
        chrom=cols[0],
        start=int(cols[1]),
        end=end
    )


def parse_gvcf_entry(line: str) -> dict[str, int | str | float]:
    cols = line.rstrip().split("\t")
    data: dict[str, int | str | float] = {
        "str": line.rstrip(),
        "chr": cols[0],
        "start": int(cols[1]),
    }
    match = re.search(r"(?:^|;)END=(.*?)(?:;|$)", cols[7])
    data["end"] = int(match.group(1)) if match else int(cols[1])

    if len(cols[3]) > 1:
        return data

    if "AD" not in cols[8].split(":"):
        data["frq"] = 0.0
        return data

    alt_alleles = cols[4].split(",")
    fmt = cols[8].split(":")
    sample = cols[9].split(":")

    alt = None
    for i, f in enumerate(fmt):
        if f == "GT":
            gt = sample[i].split("/")
            alt = gt[1]
            if alt == "." or (
                alt != "0"
                and (int(alt) - 1 >= len(alt_alleles) or len(alt_alleles[int(alt) - 1]) > 1)
            ):
                return data
            break

    alt_cnt = None
    for i, f in enumerate(fmt):
        if f == "AD":
            if alt != "0":
                alt_cnt = int(sample[i].split(",")[int(alt)])
            else:
                counts = [int(v) for v in sample[i].split(",")]
                if counts:
                    counts = counts[1:-1]
                alt_cnt = max(counts) if counts else 0
            break

    dp = None
    for i, f in enumerate(fmt):
        if f == "DP":
            dp = int(sample[i])
            break

    if dp is None or dp < 10:
        return data

    data["frq"] = float(alt_cnt) / dp if dp else 0.0
    data["ref"] = cols[3]
    data["all"] = cols[9]
    return data


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract variant allele frequencies from gvcf")
    parser.add_argument("gvcf", help="Input gvcf file (gzipped)")
    parser.add_argument("gnomad", help="gnomAD positions file")
    return parser.parse_args()


