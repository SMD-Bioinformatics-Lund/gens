"""Load transcripts into database"""

import csv
import logging
from collections import defaultdict
from itertools import chain
from typing import Any, Generator, Iterable, Optional, TextIO, TypedDict

import click

from gens.constants import MANE_PLUS_CLINICAL, MANE_SELECT
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)


class TranscriptEntry(TypedDict):
    """Represents a single transcript entry in an GTF file"""

    chrom: str
    genome_build: int
    gene_name: str
    start: int
    end: int
    strand: str
    height_order: Optional[int]
    transcript_id: str
    transcript_biotype: str
    mane: Optional[str]
    hgnc_id: Optional[str]
    refseq_id: Optional[str]
    features: list


def build_transcripts(transc_file: TextIO, mane_file: TextIO, genome_build: GenomeBuild):
    """Build transcript object from transcript and mane file."""
    mane_info = _parse_mane_transc(mane_file)

    LOG.info("%s MANE entries loaded", len(mane_info))

    annotated_mane_transc: dict[str, list[Any]] = defaultdict(list)
    transc_index = {}
    n_lines = _count_file_len(transc_file)
    with click.progressbar(
        transc_file, length=n_lines, label="Processing transcripts"
    ) as progressbar:

        skipped_no_gene_name = 0

        for transc, attribs in _parse_transcript_gtf(progressbar):
            transcript_id = attribs.get("transcript_id")
            if not transcript_id:
                raise ValueError(f"Expected an ID, found: {transcript_id}")

            if transc["feature"] == "transcript":
                selected_mane: dict[str, str] = mane_info.get(transcript_id, {})

                if attribs.get("gene_name") is None:
                    skipped_no_gene_name += 1
                    continue

                transcript_entry = _make_transcript_entry(
                    transcript_id, selected_mane, transc, attribs, genome_build
                )
                transc_index[transcript_id] = transcript_entry
                annotated_mane_transc[attribs["gene_name"]].append(transcript_entry)
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

    LOG.info(
        "%s transcripts skipped due to missing gene symbol ('gene_name' in the loaded GTF)",
        skipped_no_gene_name,
    )

    LOG.info("Assign height order values and sort features")
    for transcripts in annotated_mane_transc.values():
        _assign_height_order(transcripts)
        _sort_transcript_features(transcripts)

    return chain(*annotated_mane_transc.values())


def _make_transcript_entry(
    transcript_id: str,
    selected_name: dict[
        str,
        str,
    ],
    transc: dict[str, str],
    attribs: dict[str, str],
    genome_build: GenomeBuild,
) -> TranscriptEntry:

    return {
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


def _parse_mane_transc(mane_file: Iterable[str]) -> dict[str, dict[str, str]]:
    """Parse mane tranascript file and index on ensemble id."""
    mane_info: dict[str, dict[str, str]] = {}
    LOG.info("parsing mane transcripts")
    creader = csv.DictReader(mane_file, delimiter="\t")
    for row in creader:
        ensemble_nuc = row["Ensembl_nuc"].split(".")[0]
        mane_info[ensemble_nuc] = {
            "hgnc_id": row["HGNC_ID"].replace("HGNC:", ""),
            "refseq_id": row["RefSeq_nuc"],
            "mane_status": row["MANE_status"],
        }
    return mane_info


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


def _count_file_len(file: TextIO) -> int:
    """Count number of lines in file."""
    n_lines = sum(1 for _ in file)
    file.seek(0)  # reset file to begining
    return n_lines


def _parse_transcript_gtf(
    transc_file: Iterable[str], delimiter: str = "\t"
) -> Generator[tuple[dict[str, str], dict[str, str]], None, None]:
    """Parse transcripts."""
    col_names = [
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
    cfile = csv.DictReader(transc_file, col_names, delimiter=delimiter)
    for row in cfile:
        if row["seqname"].startswith("#") or row["seqname"] is None:
            continue

        if row["feature"] not in target_features:
            continue

        attribs = _parse_attribs(row["attribute"])
        # skip non protein coding genes
        if attribs.get("gene_biotype") == "protein_coding":
            yield row, attribs


def _assign_height_order(transcripts: list[dict[str, Any]]) -> None:
    """Assign height order for an list or transcripts.

    MANE transcript always have height order == 1
    Rest are assigned height order depending on their start position
    """
    # assign height order to name transcripts
    mane_transcript = [tr for tr in transcripts if tr["mane"] is not None]
    if len(mane_transcript) == 1:
        mane_transcript[0]["height_order"] = 1
    elif len(mane_transcript) > 1:
        # FIXME: I don't think the height order is used anymore
        # This could / should probably be removed
        sorted_mane = [
            *[tr for tr in mane_transcript if tr["mane"] == MANE_SELECT],
            *[tr for tr in mane_transcript if tr["mane"] == MANE_PLUS_CLINICAL],
            *[tr for tr in mane_transcript if not tr["mane"] in {MANE_SELECT, MANE_PLUS_CLINICAL}],
        ]
        for order, tr in enumerate(sorted_mane, 1):
            tr["height_order"] = order

    # assign height order to the rest of the transcripts
    rest = (tr for tr in transcripts if tr["mane"] is None)
    for order, tr in enumerate(
        sorted(rest, key=lambda x: int(x["start"])), start=len(mane_transcript) + 1
    ):
        tr["height_order"] = order


def _sort_transcript_features(transcripts: list[dict[str, Any]]) -> None:
    """Sort transcript features on start coordinate."""
    for tr in transcripts:
        tr["features"] = sorted(tr["features"], key=lambda x: x["start"])
