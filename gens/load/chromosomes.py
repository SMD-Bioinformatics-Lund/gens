"""Writing chromosomze size information to the database."""

import logging
import re
from typing import Any

import requests

from ..models.genomic import ChromBand, ChromInfo, DnaStrand, GenomeBuild

LOG = logging.getLogger(__name__)


def format_dna_strand(strand: int | None) -> DnaStrand:
    """Convert DNA strand from 1/0 designation to BED spec."""

    if strand == 1:
        dna_strand = DnaStrand.FOR
    elif strand == -1:
        dna_strand = DnaStrand.REV
    else:
        dna_strand = DnaStrand.UNKNOWN
    return dna_strand


def build_chromosomes_obj(
    chromosome_data: dict[str, Any], genome_build: GenomeBuild, timeout: int
) -> list[ChromInfo]:
    """Build chromosome object containing normalized size."""
    chromosomes: list[ChromInfo] = []

    genome_size = sum(c["length"] for c in chromosome_data.values())
    for name, data in chromosome_data.items():
        LOG.info("Processing chromosome %s", name)
        # calculate genome scale
        scale = round(data["length"] / genome_size, 2)
        # skip for mitochondria
        if not name == "MT":
            # get centeromer position by querying assembly annotation from EBI
            assembly_id = next(
                syn["name"].rsplit(".")[0]  # strip assembly version
                for syn in data.get("synonyms", [])
                if syn["dbname"] == "INSDC"
            )
            embl_annot = get_assembly_annotation(assembly_id, timeout=timeout)
            start, end = parse_centromere_pos(embl_annot)
            centro_pos = {"start": start, "end": end}
            # parse cytogenic bands
            cyto_bands = [
                ChromBand(
                    id=band["id"],
                    stain=band["stain"],
                    start=band["start"],
                    end=band["end"],
                    strand=format_dna_strand(band["strand"]),
                )
                for band in data["bands"]
            ]
        else:
            centro_pos = None
            cyto_bands = None

        chromosomes.append(
            ChromInfo(
                chrom=name,
                genome_build=genome_build,
                bands=cyto_bands,
                size=data["length"],
                scale=scale,
                centromere=centro_pos,
            )
        )
    return chromosomes


def get_assembly_info(
    genome_build: GenomeBuild,
    specie: str = "homo_sapiens",
    bands: bool = True,
    synonyms: bool = True,
    timeout: int = 2,
):
    """Get assembly info from ensembl."""
    base_rest_url = {"37": "grch37.rest.ensembl.org", "38": "rest.ensembl.org"}
    params: dict[str, str] = {
        "content-type": "application/json",
        "bands": str(bands),
        "synonyms": str(synonyms),
    }
    resp = requests.get(
        f"https://{base_rest_url[str(genome_build)]}/info/assembly/{specie}",
        params=params,
        timeout=timeout,
    )
    # crash if not successful
    resp.raise_for_status()
    return resp.json()


def get_assembly_annotation(insdc_id: str, data_format: str = "embl", timeout: int = 2):
    """Get assembly for id from EBI using INSDC id."""
    LOG.debug("Get assembly annotation for %s", insdc_id)
    resp = requests.get(
        f"https://www.ebi.ac.uk/ena/browser/api/{data_format}/{insdc_id}",
        timeout=timeout,
    )
    # crash if not successful
    resp.raise_for_status()
    return resp.text


def parse_centromere_pos(embl_annot: str) -> tuple[int, ...]:
    """Query EBI for centeromere position from embl annotation."""
    centeromere_pos: tuple[int, ...] | None = None
    for line in embl_annot.splitlines():
        if not line.startswith("FT"):
            continue
        # find centromere
        match = re.match(r"FT\s+centromere\s+(?P<start>\d+)\.\.(?P<end>\d+)", line)
        if match:
            centeromere_pos = tuple(map(int, match.groups()))
    if not centeromere_pos:
        match = re.search(r"ID\s+(\w+);", embl_annot)
        if not match or not match.group(1):
            raise ValueError(f"Something went wrong while parsing: {embl_annot}")
        genome_id = match.group(1)
        raise ValueError(f"No centeromere position found for {genome_id}")
    return centeromere_pos
