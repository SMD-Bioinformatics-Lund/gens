import importlib
from pathlib import Path
from typing import Any, Callable

import mongomock
import pytest

from gens.models.genomic import GenomeBuild
from gens.db.collections import TRANSCRIPTS_COLLECTION


def _build_transcript():
    from gens.models.annotation import TranscriptRecord

    return TranscriptRecord.model_validate(
        {
            "transcript_id": "t1",
            "transcript_biotype": "protein_coding",
            "gene_name": "GENE1",
            "mane": None,
            "hgnc_id": "1",
            "refseq_id": "rs1",
            "features": [],
            "chrom": "1",
            "start": 1,
            "end": 10,
            "strand": "+",
            "genome_build": 38,
        }
    )


def test_load_transcripts_invokes_crud(
    cli_load: Any,
    tmp_path: Path,
    db: mongomock.Database,
):

    gtf = tmp_path / "transcript.gtf"
    gtf_content = (
        "\t".join(
            [
                "1",
                "ensembl",
                "transcript",
                "1",
                "10",
                ".",
                "+",
                ".",
                'gene_id "G1"; gene_name "GENE1"; transcript_id "t1"; transcript_biotype "protein_coding";',
            ]
        )
        + "\t"
    )
    gtf.write_text(gtf_content)
    mane = tmp_path / "mane.txt"
    mane.write_text(
        "Ensembl_nuc\tHGNC_ID\tRefSeq_nuc\tMANE_status\n" "t1\tHGNC:1\trs1\tMANE Select\n"
    )

    assert cli_load.transcripts.callback is not None

    cli_load.transcripts.callback(
        file=str(gtf), mane=str(mane), genome_build=GenomeBuild(38)
    )

    coll = db.get_collection(TRANSCRIPTS_COLLECTION)

    assert coll.count_documents({}) == 1
    rec = coll.find_one({})
    assert rec is not None
    assert rec["transcript_id"] == "t1"
    assert rec["gene_name"] == "GENE1"
    assert rec["hgnc_id"] == "1"
    assert rec["refseq_id"] == "rs1"
    assert rec["mane"] == "MANE Select"


def test_create_transcripts_adds_documents(monkeypatch: pytest.MonkeyPatch, db: mongomock.Database) -> None:

    from gens.crud import transcripts as transcripts_mod

    monkeypatch.setattr(transcripts_mod, "register_data_update", lambda db, col: None)

    coll = db.get_collection(TRANSCRIPTS_COLLECTION)


    tr = _build_transcript()
    transcripts_mod.create_transcripts([tr], db)

    assert coll.count_documents({}) == 1
    assert coll.find_one({"transcript_id": "t1"}) is not None
