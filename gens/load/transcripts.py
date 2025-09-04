"""Load transcripts into database"""

import csv
import logging
from collections import defaultdict
from dataclasses import dataclass
from itertools import chain
from typing import Generator, Iterable, Optional, TextIO, TypedDict

import click
from pydantic import ValidationError

from gens.constants import ENSEMBL_CANONICAL
from gens.models.annotation import ExonFeature, TranscriptRecord, UtrFeature
from gens.models.genomic import GenomeBuild

LOG = logging.getLogger(__name__)


@dataclass
class GTFEntry:
    seqname: str
    start: int
    end: int
    feature: str
    strand: str
    attribs: dict[str, str]
    is_canonical: bool


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


# FIXME: Reduce complexity to satisfy flake8 warnings
def build_transcripts(
    transc_file: TextIO, mane_file: TextIO, genome_build: GenomeBuild
) -> Iterable[TranscriptRecord]:
    """Build transcript object from transcript and mane file."""
    mane_info = parse_mane_transc(mane_file)

    LOG.info("%s MANE entries loaded", len(mane_info))

    annotated_mane_transc: dict[str, list[TranscriptRecord]] = defaultdict(list)
    transc_index: dict[str, TranscriptRecord] = {}
    n_lines = _count_file_len(transc_file)
    with click.progressbar(
        transc_file, length=n_lines, label="Processing transcripts"
    ) as progressbar:

        skipped_no_gene_name = 0

        for transc in _parse_transcript_gtf(progressbar):
            transcript_id = transc.attribs.get("transcript_id")
            if not transcript_id:
                raise ValueError(f"Expected an ID, found: {transcript_id}")

            if transc.feature == "transcript":
                selected_mane: dict[str, str] = mane_info.get(transcript_id, {})

                if not selected_mane and transc.is_canonical:
                    selected_mane = {"mane_status": ENSEMBL_CANONICAL}

                if transc.attribs.get("gene_name") is None:
                    skipped_no_gene_name += 1
                    continue

                try:
                    transcript_entry = make_transcript_entry(
                        transcript_id, selected_mane, transc, genome_build
                    )
                except ValidationError as e:
                    LOG.warning(
                        "Skipping transcript %r: validation failed: %s",
                        transcript_id,
                        e,
                    )
                    continue
                transc_index[transcript_id] = transcript_entry
                annotated_mane_transc[transc.attribs["gene_name"]].append(
                    transcript_entry
                )
            elif transc.feature in ["exon", "three_prime_utr", "five_prime_utr"]:
                # add features to existing transcript
                if transcript_id in transc_index:
                    feature: ExonFeature | UtrFeature
                    if transc.feature == "exon":
                        feature = ExonFeature.model_validate(
                            {
                                "feature": transc.feature,
                                "start": transc.start,
                                "end": transc.end,
                                "exon_number": int(transc.attribs["exon_number"]),
                            }
                        )
                    else:
                        feature = UtrFeature.model_validate(
                            {
                                "feature": transc.feature,
                                "start": transc.start,
                                "end": transc.end,
                            }
                        )
                    transcript_obj = transc_index[transcript_id]
                    transcript_obj.features.append(feature)

    LOG.info(
        "%s transcripts skipped due to missing gene symbol ('gene_name' in the loaded GTF)",
        skipped_no_gene_name,
    )

    flat_transcripts = chain.from_iterable(annotated_mane_transc.values())
    return flat_transcripts


def make_transcript_entry(
    transcript_id: str,
    selected_mane: dict[
        str,
        str,
    ],
    transc: GTFEntry,
    genome_build: GenomeBuild,
) -> TranscriptRecord:

    return TranscriptRecord.model_validate(
        {
            "chrom": transc.seqname,
            "genome_build": genome_build.value,
            "gene_name": transc.attribs["gene_name"],
            "start": transc.start,
            "end": transc.end,
            "strand": transc.strand,
            "height_order": None,  # will be set later
            "transcript_id": transcript_id,
            "transcript_biotype": transc.attribs["transcript_biotype"],
            "mane": selected_mane.get("mane_status"),
            "hgnc_id": selected_mane.get("hgnc_id"),
            "refseq_id": selected_mane.get("refseq_id"),
            "features": [],
        }
    )


def parse_mane_transc(mane_file: Iterable[str]) -> dict[str, dict[str, str]]:
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
) -> Generator[GTFEntry, None, None]:
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
    for row_fields in cfile:
        if row_fields["seqname"].startswith("#") or row_fields["seqname"] is None:
            continue

        if row_fields["feature"] not in target_features:
            continue

        attribs = _parse_attribs(row_fields["attribute"])

        is_canonical = 'tag "Ensembl_canonical"' in row_fields["attribute"]

        seqname = row_fields["seqname"]
        start = int(row_fields["start"])
        end = int(row_fields["end"])
        feature = row_fields["feature"]
        strand = row_fields["strand"]

        gtf_entry = GTFEntry(
            seqname, start, end, feature, strand, attribs, is_canonical
        )

        # skip non protein coding genes
        yield gtf_entry
