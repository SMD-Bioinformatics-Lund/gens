import importlib
from pathlib import Path
from typing import Any, Callable

import pytest

from gens.models.genomic import GenomeBuild
from gens.db.collections import TRANSCRIPTS_COLLECTION
from tests.conftest import patch_cli
from tests.utils.my_mongomock import Database


@pytest.fixture
def load_transcripts_cmd() -> Any:
    module = importlib.import_module("gens.cli.load")
    return module


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
    load_transcripts_cmd, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, db: Database, patch_cli: Callable
):     

    patch_cli(load_transcripts_cmd)
    monkeypatch.setattr(load_transcripts_cmd, "get_db_connection", lambda conn, db_name: db)

    called: dict[str, Any] = {}

    def fake_build(transc_fh, mane_fh, genome_build):
        called["build"] = True
        return [_build_transcript()]

    monkeypatch.setattr(load_transcripts_cmd, "build_transcripts", fake_build)

    def fake_create(transcripts, database):
        called["create"] = list(transcripts)
        called["db"] = database

    monkeypatch.setattr(load_transcripts_cmd, "create_transcripts", fake_create)

    gtf = tmp_path / "tr.gtf"
    gtf.write_text("dummy")
    mane = tmp_path / "mane.txt"
    mane.write_text("mane")

    assert load_transcripts_cmd.transcripts.callback is not None

    load_transcripts_cmd.transcripts.callback(
        file=str(gtf), mane=str(mane), genome_build=GenomeBuild(38)
    )

    assert called.get("build")
    assert called.get("db") is db
    assert called.get("create")


def test_create_transcripts_adds_documents(monkeypatch: pytest.MonkeyPatch, db: Any) -> None:

    from gens.crud import transcripts as transcripts_mod

    monkeypatch.setattr(transcripts_mod, "register_data_update", lambda db, col: None)

    coll = db.get_collection(TRANSCRIPTS_COLLECTION)

    def insert_many(docs):
        for d in docs:
            coll.insert_one(d)

    coll.insert_many = insert_many  # type: ignore[attr-defined]

    tr = _build_transcript()
    transcripts_mod.create_transcripts([tr], db)

    assert coll.count_documents({}) == 1
    assert coll.find_one({"transcript_id": "t1"}) is not None