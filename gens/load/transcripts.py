"""Load transcripts into database"""

import csv
import logging
from collections import defaultdict
from itertools import chain
from typing import Any, Iterable, TextIO

import click

from ..models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)


def parse_mane_transc(mane_file: Iterable[str]) -> dict[str, dict[str, str]]:
    """Parse mane tranascript file and index on ensemble id."""
    mane: dict[str, dict[str, str]] = {}
    LOG.info("parsing mane transcripts")
    creader = csv.DictReader(mane_file, delimiter="\t")
    for row in creader:
        ensemble_nuc = row["Ensembl_nuc"].split(".")[0]
        mane[ensemble_nuc] = {
            "hgnc_id": row["HGNC_ID"].replace("HGNC:", ""),
            "refseq_id": row["RefSeq_nuc"],
            "mane_status": row["MANE_status"],
        }
    return mane


def _parse_attribs(attributes_str: str) -> dict[str, str]:
    """
    Parse attribute strings.

    Example:
        Input: 'key1 "value1"; key2 "value2"'
        Output: {'key1': 'value1', 'key2': 'value2'}
    """
    attributes_dict: dict[str, str] = {}
    for attrib in attributes_str.split(";"):
        attrib = attrib.strip()

        if not attrib:
            continue

        key_value = attrib.split(" ", 1)

        if len(key_value) != 2:
            raise ValueError(f"Invalid attribute format: {attrib}")

        key, value = key_value
        clean_value = value.replace('"', "").strip()
        attributes_dict[key] = clean_value

    return attributes_dict

    # FIXME: Old code - remove when above code is confirmed to be correct
    # return dict(
    #     [
    #         map(lambda x: x.replace('"', ""), a.strip().split(" ", 1))
    #         for a in attribs.split(";")
    #         if a
    #     ]
    # )


def _count_file_len(file: TextIO) -> int:
    """Count number of lines in file."""
    n_lines = sum(1 for _line in file)
    file.seek(0)  # reset file to begining
    return n_lines


def parse_transcript_gtf(transc_file: TextIO, delimiter: str = "\t"):
    """Parse transcripts."""
    # setup reader
    COL_NAMES = [
        "seqname",
        "source",
        "feature",
        "start",
        "end",
        "score",
        "strand",
        "frame",
        "attribute",
    ]
    target_features = ("transcript", "exon", "three_prime_utr", "five_prime_utr")
    LOG.debug("parsing transcripts")
    cfile = csv.DictReader(transc_file, COL_NAMES, delimiter=delimiter)
    for row in cfile:
        if row["seqname"].startswith("#") or row["seqname"] is None:
            continue

        if row["feature"] not in target_features:
            continue

        attribs = _parse_attribs(row["attribute"])
        # skip non protein coding genes
        if attribs.get("gene_biotype") == "protein_coding":
            yield row, attribs


def _assign_height_order(transcripts: list[dict[str, Any]]):
    """Assign height order for an list or transcripts.

    MANE transcript allways have height order == 1
    Rest are assinged height order depending on their start position
    """
    # assign height order to name transcripts
    mane_transcript = [tr for tr in transcripts if tr["mane"] is not None]
    if len(mane_transcript) == 1:
        mane_transcript[0]["height_order"] = 1
    elif len(mane_transcript) > 1:
        sorted_mane = [
            *[tr for tr in mane_transcript if tr["mane"] == "MANE Select"],
            *[tr for tr in mane_transcript if tr["mane"] == "MANE Plus Clinical"],
            *[
                tr
                for tr in mane_transcript
                if not any(
                    [tr["mane"] == "MANE Plus Clinical", tr["mane"] == "MANE Select"]
                )
            ],
        ]
        for order, tr in enumerate(sorted_mane, 1):
            tr["height_order"] = order

    # assign height order to the rest of the transcripts
    rest = (tr for tr in transcripts if tr["mane"] is None)
    for order, tr in enumerate(
        sorted(rest, key=lambda x: int(x["start"])), start=len(mane_transcript) + 1
    ):
        tr["height_order"] = order


def _sort_transcript_features(transcripts: list[str]):
    """Sort transcript features on start coordinate."""
    for tr in transcripts:
        tr["features"] = sorted(tr["features"], key=lambda x: x["start"])


def build_transcripts(
    transc_file: TextIO, mane_file: TextIO, genome_build: GenomeBuild
):
    """Build transcript object from transcript and mane file."""
    mane_transc = parse_mane_transc(mane_file)
    results: dict[str, list[str]] = defaultdict(list)
    transc_index = {}
    n_lines = _count_file_len(transc_file)
    with click.progressbar(
        transc_file, length=n_lines, label="Processing transcripts"
    ) as progressbar:
        for transc, attribs in parse_transcript_gtf(progressbar):
            transcript_id = attribs.get("transcript_id")
            # store transcripts in index
            if transc["feature"] == "transcript":
                selected_name = mane_transc.get(transcript_id, {})
                # FIXME: More typing work here when we have data types defined
                res = {
                    "chrom": transc["seqname"],
                    "genome_build": genome_build.value,
                    "gene_name": attribs["gene_name"],
                    "start": int(transc["start"]),
                    "end": int(transc["end"]),
                    "strand": transc["strand"],
                    "height_order": None,  # will be set later
                    "transcript_id": transcript_id,
                    "transcript_biotype": attribs["transcript_biotype"],
                    "mane": selected_name.get("mane_status"),
                    "hgnc_id": selected_name.get("hgnc_id"),
                    "refseq_id": selected_name.get("refseq_id"),
                    "features": [],
                }
                transc_index[transcript_id] = res
                results[attribs["gene_name"]].append(res)
            elif transc["feature"] in ["exon", "three_prime_utr", "five_prime_utr"]:
                # add features to existing transcript
                if transcript_id in transc_index:
                    specific_params = {}
                    if transc["feature"] == "exon":
                        specific_params["exon_number"] = int(attribs["exon_number"])
                    transc_index[transcript_id]["features"].append(
                        {
                            **{
                                "feature": transc["feature"],
                                "start": int(transc["start"]),
                                "end": int(transc["end"]),
                            },
                            **specific_params,
                        }
                    )

    LOG.info("Assign height order values and sort features")
    for transcripts in results.values():
        _assign_height_order(transcripts)
        _sort_transcript_features(transcripts)
    return chain(*results.values())
