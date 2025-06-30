#!/usr/bin/env python3
"""Extract variant allele frequencies from a gzipped GVCF file.

The script expects a BGZF compressed gvcf file and a file with
chromosome and position columns (gnomAD positions). It prints the
frequency for every matching position.
"""

from __future__ import annotations

import argparse
import gzip
from pathlib import Path
import re
import sys
from typing import Optional












# class Position:
#     def __init__(self, chrom: str, start: int, end: int):
#         self.chrom = chrom
#         self.start = start
#         self.end = end







def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract variant allele frequencies from gvcf")
    parser.add_argument("gvcf", help="Input gvcf file (gzipped)")
    parser.add_argument("gnomad", help="gnomAD positions file")
    return parser.parse_args()


