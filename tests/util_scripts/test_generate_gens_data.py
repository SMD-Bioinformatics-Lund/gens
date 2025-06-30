import io
from pathlib import Path

from utils.generate_gens_data import generate_baf_bed, generate_cov_bed


def test_generate_baf_bed(tmp_path: Path):
    baf_file = tmp_path / "input.baf"
    baf_file.write_text("\n".join([
        "chr1\t10\t0.1",
        "chr1\t20\t0.2",
        "chr1\t30\t0.3",
        "chr1\t40\t0.4",
    ]))

    output = io.StringIO()
    generate_baf_bed(str(baf_file), skip=2, prefix="x", out_fh=output)
    lines = output.getvalue().splitlines()

    assert lines == [
        "x_chr1\t9\t10\t0.1",
        "x_chr1\t29\t30\t0.3",
    ]


def test_generate_cov_bed(tmp_path: Path):
    cov_file = tmp_path / "input.cov"
    cov_file.write_text("\n".join([
        "chr1\t1\t50\t0.1",
        "chr1\t51\t100\t0.2",
        "chr1\t101\t150\t0.4",
        "chr1\t151\t200\t0.6",
    ]))

    output = io.StringIO()
    generate_cov_bed(str(cov_file), win_size=100, prefix="x", out_fh=output)
    lines = output.getvalue().splitlines()

    assert lines == [
        "x_chr1\t49\t50\t0.15000000000000002",
        "x_chr1\t149\t150\t0.5",
    ]
