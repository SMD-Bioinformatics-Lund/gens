import gzip
import io
from pathlib import Path

from utils.generate_gens_data import generate_baf_bed, generate_cov_bed, parse_gvcfvaf


def test_generate_baf_bed(tmp_path: Path):
    baf_file = tmp_path / "input.baf"
    baf_file.write_text(
        "\n".join(
            [
                "chr1\t10\t0.1",
                "chr1\t20\t0.2",
                "chr1\t30\t0.3",
                "chr1\t40\t0.4",
            ]
        )
    )

    output = io.StringIO()
    generate_baf_bed(str(baf_file), skip=2, prefix="x", out_fh=output)
    lines = output.getvalue().splitlines()

    assert lines == [
        "x_chr1\t9\t10\t0.1",
        "x_chr1\t29\t30\t0.3",
    ]


def test_generate_cov_bed(tmp_path: Path):
    cov_file = tmp_path / "input.cov"
    cov_file.write_text(
        "\n".join(
            [
                "chr1\t1\t50\t0.1",
                "chr1\t51\t100\t0.2",
                "chr1\t101\t150\t0.4",
                "chr1\t151\t200\t0.6",
            ]
        )
    )

    output = io.StringIO()
    generate_cov_bed(cov_file, win_size=100, prefix="x", out_fh=output)
    lines = output.getvalue().splitlines()

    assert lines == [
        "x_chr1\t49\t50\t0.15000000000000002",
        "x_chr1\t149\t150\t0.5",
    ]


def test_generate_cov_bed_gap_and_chromosome(tmp_path: Path):
    cov_file = tmp_path / "gap.cov"
    cov_file.write_text(
        "\n".join(
            [
                "chr1\t1\t60\t0.1",
                "chr2\t1\t50\t0.2",
                "chr2\t51\t100\t0.4",
            ]
        )
    )

    output = io.StringIO()
    generate_cov_bed(cov_file, win_size=100, prefix="x", out_fh=output)

    assert output.getvalue().splitlines() == [
        "x_chr1\t29\t30\t0.1",
        "x_chr2\t49\t50\t0.30000000000000004",
    ]


def test_generate_cov_bed_incomplete_window(tmp_path: Path):
    cov_file = tmp_path / "incomplete.cov"
    cov_file.write_text(
        "\n".join(
            [
                "chr1\t1\t50\t0.1",
                "chr1\t51\t90\t0.2",
            ]
        )
    )

    output = io.StringIO()
    generate_cov_bed(cov_file, win_size=100, prefix="x", out_fh=output)

    assert output.getvalue().splitlines() == []


def test_parse_gvcfvaf(tmp_path: Path, capsys):
    gvcf_file = tmp_path / "sample.vcf.gz"
    with gzip.open(gvcf_file, "wt") as fh:
        fh.write("##header\n")
        fh.write("1\t10\t.\tA\tC\t.\tPASS\tEND=10\tGT:AD:DP\t0/1:8,2:10\n")
        fh.write("1\t20\t.\tA\tC\t.\tPASS\tEND=20\tGT:AD:DP\t0/0:10,0:10\n")
        fh.write("1\t30\t.\tA\tC\t.\tPASS\tEND=30\tGT:AD:DP\t0/1:5,5:8\n")

    gnomad_file = tmp_path / "gnomad.tsv"
    gnomad_file.write_text("\n".join(["1\t10", "1\t20", "1\t30"]))

    depth_threshold = 10

    output = io.StringIO()
    parse_gvcfvaf(gvcf_file, gnomad_file, output, depth_threshold)
    captured = capsys.readouterr()

    assert output.getvalue().splitlines() == [
        "1\t10\t0.2",
        "1\t20\t0.0",
    ]
    assert "1 variants skipped!" in captured.err
