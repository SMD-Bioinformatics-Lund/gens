from __future__ import annotations

from dataclasses import dataclass
from types import ModuleType
from pathlib import Path
from typing import Callable

import mongomock
import pytest
import logging

from gens.db.collections import ANNOTATION_TRACKS_COLLECTION, ANNOTATIONS_COLLECTION

LOG = logging.getLogger(__name__)

@dataclass
class AnnotEntry:
    chrom: str
    start_pos: int
    end_pos: int
    label: str
    strand: str
    color: str
    score: int


@pytest.fixture
def annot_entry() -> AnnotEntry:
    entry = AnnotEntry(
        chrom="1",
        start_pos=0,
        end_pos=10,
        label="test_annotation",
        strand="+",
        color="rgb(0,0,0)",
        score=10,
    )
    return entry


def test_load_annotations_from_bed(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    bed_file = tmp_path / "track.bed"
    bed_file.write_text(
        "\t".join(
            [
                annot_entry.chrom,
                str(annot_entry.start_pos),
                str(annot_entry.end_pos),
                annot_entry.label,
                str(annot_entry.score),
                annot_entry.strand,
                ".",
                ".",
                annot_entry.color,
            ]
        )
    )

    cli_load.annotations.callback(
        file=bed_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    assert track_coll.count_documents({}) == 1
    track_info = track_coll.find_one({})
    assert track_info is not None
    assert track_info["name"] == "track"
    assert track_info["description"] == ""
    assert track_info["maintainer"] == None
    assert track_info["metadata"] == []
    assert track_info["genome_build"] == 38

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    assert annot_coll.count_documents({}) == 1
    rec = annot_coll.find_one({})
    LOG.debug(rec)
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == annot_entry.start_pos + 1
    assert rec["end"] == annot_entry.end_pos
    assert rec["name"] == annot_entry.label
    assert rec["color"] == [0, 0, 0]


def test_load_annotations_from_tsv(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    header = "\t".join(["Chromosome", "Start", "Stop", "Name", "Color"])
    content = "\t".join(
            [annot_entry.chrom, str(annot_entry.start_pos), str(annot_entry.end_pos), annot_entry.label, annot_entry.color]
        )

    file_content = "\n".join([header, content])

    tsv_file = tmp_path / "track.tsv"
    tsv_file.write_text(file_content)

    cli_load.annotations.callback(
        file=tsv_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    track_info = track_coll.find_one({})
    assert track_info is not None
    assert track_info["name"] == "track"
    assert track_info["description"] == ""
    assert track_info["maintainer"] == None
    assert track_info["metadata"] == []
    assert track_info["genome_build"] == 38

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    assert track_coll.count_documents({}) == 1
    assert annot_coll.count_documents({}) == 1
    rec = annot_coll.find_one({})
    LOG.debug(rec)
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == annot_entry.start_pos + 1
    assert rec["end"] == annot_entry.end_pos
    assert rec["name"] == annot_entry.label
    assert rec["color"] == [0, 0, 0]


def test_load_annotations_from_tsv_with_comments(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    header = "\t".join([
        "Chromosome",
        "Start",
        "Stop",
        "Name",
        "Color",
        "Comments",
    ])
    content = "\t".join(
        [
            annot_entry.chrom,
            str(annot_entry.start_pos),
            str(annot_entry.end_pos),
            annot_entry.label,
            annot_entry.color,
            "a comment; another comment",
        ]
    )

    file_content = "\n".join([header, content])

    tsv_file = tmp_path / "track.tsv"
    tsv_file.write_text(file_content)

    cli_load.annotations.callback(
        file=tsv_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=False,
    )

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    rec = annot_coll.find_one({})
    assert rec is not None
    assert len(rec["comments"]) == 2
    assert rec["comments"][0]["comment"] == "a comment"
    assert rec["comments"][1]["comment"] == "another comment"


def test_load_annotations_parses_aed(
    cli_load: ModuleType,
    tmp_path: Path,
    db: mongomock.Database,
    annot_entry: AnnotEntry,
):
    aed_file = tmp_path / "track.aed"
    aed_file.write_text(
"""bio:sequence(aed:String)	bio:start(aed:Integer)	bio:end(aed:Integer)	aed:name(aed:String)	aed:value(aed:String)	aed:category(aed:String)	style:color(aed:Color)	aed:modifiedBy(aed:String)	aed:reference(aed:URI)	affx:materialModifiedBy(aed:String)	aed:modified(aed:DateTime)	bio:cdsMax(aed:Integer)	aed:note(aed:String)	bio:cdsMin(aed:Integer)	aed:counter(aed:Integer)	affx:materialModified(aed:DateTime)	bio:state(aed:Rational)	bed:score(aed:Integer)	affx:interpreted(aed:DateTime)	affx:interpretedBy(aed:String)	affx:inheritance(aed:String)	affx:interpretation(aed:String)	affx:call(aed:String)
			namespace:affx(aed:URI)	http://affymetrix.com/ontology/																		
			namespace:bed(aed:URI)	http://affymetrix.com/ontology/genome.ucsc.edu/bed/																		
			affx:ucscGenomeVersion(aed:String)	hg38																		
			aed:application(aed:String)	Chromosome Analysis Suite 4.5.0.34																		
			aed:created(aed:DateTime)	2016-02-25T13:44:01.829+01:00																		
			aed:modified(aed:DateTime)	2025-02-23T16:45:29.113+01:00																		
chr1	10001	11372343	1p36 deletion syndrome, distal		Decipher; OMIM #607872; ORPHA:1606; Rarechromo; ClinGen	rgb(204,0,0)	115422:TJ	https://omim.org/entry/607872	115422:TJ	2025-01-15T22:33:40.385+01:00		"Decipher (https://www.deciphergenomics.org/syndrome/18/overview); OMIM #607872; ORPHA:1606 ""1p36 deletion syndrome""; Rarechromo.org ""1p36 deletions""; GeneReviews ""1p36 Deletion Syndrome"" (PMID: 20301370, www.ncbi.nlm.nih.gov/books/NBK1191); NIH (https://medlineplus.gov/genetics/condition/1p36-deletion-syndrome); ClinGen (https://search.clinicalgenome.org/kb/gene-dosage/region/ISCA-374344); Socialstyrelsen (www.socialstyrelsen.se/kunskapsstod-och-regler/omraden/sallsynta-halsotillstand/om-kunskapsdatabasen/sok-bland-sallsynta-halsotillstand/1p36-deletionssyndrome)"		0	2025-01-13T17:20:14.947+01:00							
chr1	6101786	6180321	Parenti-Mignot neurodevelopmental syndrome (CHD5)		OMIM #619873; Case Reports	rgb(204,0,0)	115422:TJ	https://omim.org/entry/619873	115422:TJ	2025-01-15T22:43:02.183+01:00	0	Local case 4082-22. OMIM #619873; Decipher (www.deciphergenomics.org/gene/CHD5/overview/clinical-info); Parenti et al., 2021, Missense and truncating variants in CHD5 in a dominant neurodevelopmental disorder with intellectual disability, behavioral disturbances, and epilepsy (PMID: 33944996)	0	0	2025-01-15T22:43:02.184+01:00							
chr1	6785323	7769706	Cerebellar dysfunction with variable cognitive and behavioral abnormalities (CAMTA1)		OMIM #614756; ORPHA:314647; ClinGen	rgb(204,0,0)	115422:TJ	https://omim.org/entry/614756	115422:TJ	2025-01-15T22:46:22.835+01:00		"OMIM #614756; ORPHA:314647 ""Non-progressive cerebellar ataxia with intellectual disability""; Decipher (www.deciphergenomics.org/gene/CAMTA1/overview/clinical-info); Shinawi et al., 2015, Intragenic CAMTA1 deletions are associated with a spectrum of neurobehavioral phenotypes (PMID: 24738973); ClinGen (https://search.clinicalgenome.org/kb/gene-dosage/CAMTA1)"		0	2025-01-13T18:44:12.735+01:00							
chr1	8352403	8817640	Neurodevelopmental disorder with or without anomalies of the brain, eye, or heart (RERE)		OMIM #616975; ORPHA:494344; GeneReviews	rgb(204,0,0)	115422:TJ	https://omim.org/entry/616975	115422:TJ	2025-01-15T22:50:00.442+01:00		"MANE Select NM_001042681. OMIM #616975; ORPHA:494344 ""RERE-related neurodevelopmental syndrome""; Fregeau et al., 2016, De novo mutations of RERE cause a genetic syndrome with features that overlap those associated with proximal 1p36 deletions (PMID: 27087320); Jordan et al., 2018, Genotype-phenotype correlations in individuals with pathogenic RERE variants (PMID: 29330883); GeneReviews ""RERE-Related Disorders"" (PMID: 30896913, www.ncbi.nlm.nih.gov/books/NBK538938); NIH (https://medlineplus.gov/genetics/gene/rere)"		0	2025-01-13T18:45:43.626+01:00							
chr1	15847864	15940460	Radio-Tartaglia syndrome (SPEN)		OMIM #619312	rgb(204,0,0)	115422:TJ	https://omim.org/entry/619312	115422:TJ Genomik	2025-01-15T22:57:16.413+01:00	0	OMIM #619312; Radio et al., 2021, SPEN haploinsufficiency causes a neurodevelopmental disorder overlapping proximal 1p36 deletion syndrome with an episignature of X chromosomes in females (PMID: 33596411); https://panelapp.genomicsengland.co.uk/panels/285/gene/SPEN; Decipher (www.deciphergenomics.org/gene/SPEN/overview/clinical-info)	0	0	2022-09-23T15:56:45.119+02:00"""
    )
    cli_load.annotations.callback(
        file=aed_file,
        genome_build=38,
        is_tsv=False,
        ignore_errors=True,
    )

    track_coll = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    assert track_coll.count_documents({}) == 1
    track_info = track_coll.find_one({})

    assert track_info is not None
    assert track_info["name"] == "track"
    assert track_info["description"] == ""
    assert track_info["maintainer"] == None
    assert len(track_info["metadata"]) == 4
    assert track_info["genome_build"] == 38

    annot_coll = db.get_collection(ANNOTATIONS_COLLECTION)
    assert annot_coll.count_documents({}) == 5
    rec = annot_coll.find_one({})
    assert rec is not None
    assert rec["chrom"] == "1"
    assert rec["start"] == 10001
    assert rec["end"] == 11372343
    assert rec["name"] == "1p36 deletion syndrome, distal"
    assert rec["color"] == [204, 0, 0]


def test_delete_annotation_cli_removes_documents(
    cli_delete: ModuleType,
    db: mongomock.Database,
) -> None:
    tracks = db.get_collection(ANNOTATION_TRACKS_COLLECTION)
    annots = db.get_collection(ANNOTATIONS_COLLECTION)

    res = tracks.insert_one(
        {
            "name": "track1",
            "description": "",
            "maintainer": None,
            "metadata": [],
            "genome_build": 38,
        }
    )

    annots.insert_one(
        {
            "track_id": res.inserted_id,
            "name": "rec",
            "chrom": "1",
            "start": 1,
            "end": 10,
            "genome_build": 38,
            "color": [0, 0, 0],
            "description": None,
            "comments": [],
            "references": [],
            "metadata": [],
        }
    )

    cli_delete.annotation.callback(genome_build=38, name="track1")

    assert tracks.count_documents({}) == 0
    assert annots.count_documents({}) == 0
