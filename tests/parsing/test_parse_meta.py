from pathlib import Path

from gens.load.meta import parse_meta_file, value_exists


def test_value_exists():
    assert value_exists("foo")
    assert not value_exists("")
    assert not value_exists(".")
    assert not value_exists(None)


def test_parse_meta_file(data_path: Path):
    meta_path = data_path / "meta.tsv"
    meta = parse_meta_file(meta_path)

    assert meta.file_name == "meta.tsv"
    assert meta.row_name_header == "sample"
    assert len(meta.data) == 3

    first, second, third = meta.data

    assert first.type == "A"
    assert first.value == "valA"
    assert first.row_name == "first"
    assert first.color == "rgb(1,2,3)"

    assert second.type == "B"
    assert second.row_name == "second"
    # '.' should result in default color
    assert second.color == "rgb(0,0,0)"

    assert third.type == "C"
    assert third.row_name is None
    assert third.color == "rgb(4,5,6)"


def test_parse_meta_file_without_row_name(data_path: Path):
    meta_path = data_path / "meta_norow.tsv"
    meta = parse_meta_file(meta_path)

    assert meta.file_name == "meta_norow.tsv"
    assert meta.row_name_header is None
    assert len(meta.data) == 3

    one, two, three = meta.data
    assert one.color == "rgb(7,8,9)"
    assert two.color == "rgb(0,0,0)"
    assert three.color == "rgb(0,0,0)"
    assert all(entry.row_name is None for entry in meta.data)
