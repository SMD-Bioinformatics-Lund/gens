import pytest

from utils.new.gvcfvaf import (
    chr_position_less,
    gvcf_position,
    parse_gvcf_entry,
)


def test_chr_position_less():
    assert chr_position_less("1", 100, "1", 200)
    assert chr_position_less("1", 50, "2", 1)
    assert not chr_position_less("2", 200, "1", 300)


def test_gvcf_position():
    line = "1\t1000\t.\tA\tC\t.\tPASS\tEND=1005\tGT:AD:DP\t0/1:8,2:10"
    pos = gvcf_position(line)
    assert pos == {"chr": "1", "start": 1000, "end": 1005}


def test_parse_gvcf_entry_het():
    line = "1\t1000\t.\tA\tC\t.\tPASS\tEND=1005\tGT:AD:DP\t0/1:8,2:10"
    parsed = parse_gvcf_entry(line)
    assert parsed["chr"] == "1"
    assert parsed["start"] == 1000
    assert parsed["end"] == 1005
    assert parsed["ref"] == "A"
    assert parsed["all"] == "0/1:8,2:10"
    assert parsed["frq"] == pytest.approx(0.2)


def test_parse_gvcf_entry_hom_ref():
    line = "1\t2000\t.\tA\tC,T\t.\tPASS\tEND=2000\tGT:AD:DP\t0/0:10,5,2:15"
    parsed = parse_gvcf_entry(line)
    assert parsed["frq"] == pytest.approx(5 / 15)
