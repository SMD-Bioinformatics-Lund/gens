import gzip
import io
from pathlib import Path

from utils.generate_gens_data import (
    generate_baf_bed,
    generate_cov_bed,
    main,
    parse_gvcfvaf,
)

FIXTURES = Path(__file__).parent.parent / "data" / "generate_gens_data"


def test_generate_baf_bed(tmp_path: Path):
    baf_file = tmp_path / "input.baf"
    baf_file.write_text(
        "\n".join(
            [
                "1\t10\t0.1",
                "1\t20\t0.2",
                "1\t30\t0.3",
                "1\t40\t0.4",
            ]
        )
    )

    output = io.StringIO()
    generate_baf_bed(str(baf_file), skip=2, prefix="x", out_fh=output)
    lines = output.getvalue().splitlines()

    assert lines == [
        "x_1\t9\t10\t0.1",
        "x_1\t29\t30\t0.3",
    ]


def test_generate_baf_bed_normalizes_chromosomes(tmp_path: Path):
    baf_file = tmp_path / "normalize.baf"
    baf_file.write_text(
        "\n".join(
            [
                "1\t10\t0.1",
                "chr2\t20\t0.2",
                "chrM\t30\t0.3",
                "M\t40\t0.4",
            ]
        )
    )

    output = io.StringIO()
    generate_baf_bed(str(baf_file), skip=1, prefix="x", out_fh=output)

    assert output.getvalue().splitlines() == [
        "x_1\t9\t10\t0.1",
        "x_2\t19\t20\t0.2",
        "x_MT\t29\t30\t0.3",
        "x_MT\t39\t40\t0.4",
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
        "x_1\t49\t50\t0.15000000000000002",
        "x_1\t149\t150\t0.5",
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
        "x_1\t29\t30\t0.1",
        "x_2\t49\t50\t0.30000000000000004",
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
        fh.write("MT\t40\t.\tA\tC\t.\tPASS\tEND=40\tGT:AD:DP\t0/1:6,6:12\n")

    gnomad_file = tmp_path / "gnomad.tsv"
    gnomad_file.write_text("\n".join(["1\t10", "1\t20", "1\t30", "MT\t40"]))

    depth_threshold = 10

    output = io.StringIO()
    parse_gvcfvaf(gvcf_file, gnomad_file, output, depth_threshold)
    captured = capsys.readouterr()

    assert output.getvalue().splitlines() == ["1\t10\t0.2", "1\t20\t0.0", "MT\t40\t0.5"]
    assert "1 variants skipped!" in captured.err


def test_parse_gvcfvaf_accepts_gzipped_baf_positions(tmp_path: Path):

    gvcf_file = tmp_path / "sample.vcf.gz"
    with gzip.open(gvcf_file, "wt", encoding="utf-8") as fh:
        fh.write((FIXTURES / "sample.g.vcf").read_text())

    positions_file = tmp_path / "baf_positions.tsv.gz"
    with gzip.open(positions_file, "wt", encoding="utf-8") as fh:
        fh.write((FIXTURES / "baf_positions.tsv").read_text())

    output = io.StringIO()
    parse_gvcfvaf(gvcf_file, positions_file, output, depth_threshold=1)

    assert output.getvalue().splitlines() == ["1\t10\t0.2", "1\t20\t0.0"]


def test_parse_gvcfvaf_with_chr_prefix(tmp_path: Path, capsys):

    gvcf_file = tmp_path / "sample.vcf.gz"
    with gzip.open(gvcf_file, "wt") as fh:
        fh.write("##header\n")
        fh.write("chr1\t10\t.\tA\tC\t.\tPASS\tEND=10\tGT:AD:DP\t0/1:8,2:10\n")
        fh.write("chr1\t20\t.\tA\tC\t.\tPASS\tEND=20\tGT:AD:DP\t0/0:10,0:10\n")
        fh.write("chr1\t30\t.\tA\tC\t.\tPASS\tEND=30\tGT:AD:DP\t0/1:5,5:8\n")
        fh.write("chrMT\t40\t.\tA\tC\t.\tPASS\tEND=40\tGT:AD:DP\t0/1:6,6:12\n")
        fh.write("chrM\t41\t.\tA\tC\t.\tPASS\tEND=40\tGT:AD:DP\t0/1:6,6:12\n")

    gnomad_file = tmp_path / "gnomad.tsv"
    gnomad_file.write_text(
        "\n".join(["1\t10", "1\t20", "chr1\t30", "chrMT\t40", "chrMT\t41"])
    )

    depth_threshold = 10

    output = io.StringIO()
    parse_gvcfvaf(gvcf_file, gnomad_file, output, depth_threshold)
    captured = capsys.readouterr()

    assert output.getvalue().splitlines() == [
        "1\t10\t0.2",
        "1\t20\t0.0",
        "MT\t40\t0.5",
        "MT\t41\t0.5",
    ]
    assert "1 variants skipped!" in captured.err


def test_generate_gens_data_end_to_end(tmp_path: Path):

    outdir = tmp_path / "out"
    coverage_file = tmp_path / "coverage.tsv"
    coverage_file.write_text(
        "\n".join(
            [
                "chr1\t1\t50\t0.1",
                "chr1\t51\t100\t0.2",
            ]
        )
    )

    gvcf_file = tmp_path / "sample.g.vcf.gz"
    with gzip.open(gvcf_file, "wt", encoding="utf-8") as fh:
        fh.write("##header\n")
        fh.write("1\t10\t.\tA\tC\t.\tPASS\tEND=10\tGT:AD:DP\t0/1:8,2:10\n")
        fh.write("1\t20\t.\tG\tT\t.\tPASS\tEND=20\tGT:AD:DP\t0/0:10,0:10\n")

    positions_file = tmp_path / "baf_positions.tsv"
    positions_file.write_text("\n".join(["1\t10", "1\t20"]))

    main(
        label="sample",
        coverage=coverage_file,
        gvcf=gvcf_file,
        baf_positions=positions_file,
        out_dir=outdir,
        bigwig=False,
        baf_min_depth=1,
        bgzip_tabix_output=False,
        threads=1,
    )

    cov_output = outdir / "sample.cov.bed"
    baf_output = outdir / "sample.baf.bed"

    assert cov_output.exists()
    assert baf_output.exists()
    assert not (outdir / "sample.baf.tmp").exists()

    assert cov_output.read_text().splitlines() == [
        "d_1\t49\t50\t0.15000000000000002",
    ]

    assert baf_output.read_text().splitlines() == [
        "o_1\t9\t10\t0.2",
        "a_1\t9\t10\t0.2",
        "b_1\t9\t10\t0.2",
        "c_1\t9\t10\t0.2",
        "d_1\t9\t10\t0.2",
        "d_1\t19\t20\t0.0",
    ]


def test_generate_gens_data_supports_gzipped_baf_positions(tmp_path: Path):

    outdir = tmp_path / "out"
    coverage_file = tmp_path / "coverage.tsv"
    coverage_file.write_text((FIXTURES / "coverage.tsv").read_text())

    gvcf_file = tmp_path / "sample.g.vcf.gz"
    with gzip.open(gvcf_file, "wt", encoding="utf-8") as fh:
        fh.write((FIXTURES / "sample.g.vcf").read_text())

    positions_file = tmp_path / "baf_positions.tsv.gz"
    with gzip.open(positions_file, "wt", encoding="utf-8") as fh:
        fh.write((FIXTURES / "baf_positions.tsv").read_text())

    main(
        label="sample",
        coverage=coverage_file,
        gvcf=gvcf_file,
        baf_positions=positions_file,
        out_dir=outdir,
        bigwig=False,
        baf_min_depth=1,
        bgzip_tabix_output=False,
        threads=1,
    )

    baf_output = outdir / "sample.baf.bed"

    assert baf_output.exists()
    assert baf_output.read_text().splitlines() == [
        "o_1\t9\t10\t0.2",
        "a_1\t9\t10\t0.2",
        "b_1\t9\t10\t0.2",
        "c_1\t9\t10\t0.2",
        "d_1\t9\t10\t0.2",
        "d_1\t19\t20\t0.0",
    ]
