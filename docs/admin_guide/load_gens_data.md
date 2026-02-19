# Loading data into Gens

After installation, you can load data into the Gens database using the included CLI.

```bash
gens load --help
```

## Chromosome sizes

Gens requires chromosome sizes together with band and centromere information. By default, this command downloads assembly data from Ensembl/EBI.

```bash
gens load chromosomes --genome-build 38
```

This will fetch the karyotype for the selected build and replace any previous entries.

Optionally, you can provide a local JSON assembly file with `--file` instead of downloading data.

## Gene information

Genes and transcripts are loaded from a reference GTF together with a MANE summary. Download the files for the genome build you plan to use and run the loader.

```bash
# download reference files
curl --silent --output ./Homo_sapiens.GRCh38.113.gtf.gz https://ftp.ensembl.org/pub/release-113/gtf/homo_sapiens/Homo_sapiens.GRCh38.113.gtf.gz
curl --silent --output ./MANE.GRCh38.v1.4.summary.txt.gz https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_1.4/MANE.GRCh38.v1.4.summary.txt.gz
# load files into database
gens load transcripts --file Homo_sapiens.GRCh38.113.gtf.gz --mane MANE.GRCh38.v1.4.summary.txt.gz -b 38
```

Annotation tracks can be loaded into the database as `bed`, `aed`, or `tsv`.

## Loading samples into Gens

Each sample requires a coverage file and a BAF file. Both files must be gzip-compressed data files with matching tabix index files (`.tbi`). Provide a sample ID (`--sample-id`), case ID (`--case-id`), and genome build (`--genome-build` or `-b`) when loading.

In multi-sample cases, sample type (for example `proband`, `mother`, `father`, `tumor`, `normal`, `relative`) helps Gens determine the primary sample and which saved view settings/profile to apply.

Sex is optional.

Input files can be generated from standardized coverage output and a gVCF as described in [Generate sample data](./generate_gens_data.md). The script creates tabix-indexed files named `<SAMPLE_ID>.cov.bed.gz` and `<SAMPLE_ID>.baf.bed.gz`.

When loading a sample, Gens validates that each input file can be read as gzip, has at least four tab-separated columns, uses a `zoom_chrom` first column (for example `a_1`, `d_22`, `0_X`), and has numeric start/end/value columns.

### Loading a single sample

Samples can be loaded one at a time:

```bash
gens load sample \
    --sample-id hg002 \
    --case-id giab-trio \
    --genome-build 38 \
    --baf /path/to/baf.bed.gz \
    --coverage /path/to/coverage.bed.gz \
    --sample-type proband \
    --sex M
```

Loaded samples are organized by case and genome build. For example, you can compose a trio case by loading three samples under the same case ID and build.

If you want a display label that differs from the internal case ID, add `--display-case-id`.

### Updating an existing sample

Use `gens update sample` to update sample fields after loading (for example sample type, sex, BAF/coverage paths, or metadata).

```bash
gens update sample \
    --sample-id hg002 \
    --case-id giab-trio \
    --genome-build 38 \
    --sample-type proband \
    --sex M \
    --meta /path/to/hg002.meta.tsv \
    --force
```

Notes:

* `--sample-id`, `--case-id`, and `--genome-build` identify the sample to update.
* `--meta` replaces existing metadata with the same file name on that sample.
* Without `--force`, Gens asks for confirmation before overwriting existing metadata.
* Repeat the command with a different `--meta` file to update multiple metadata files.

### Loading a full case

Alternatively, you can load a full case from a Gens YAML file.

Example (only `case_id`, `genome_build` and samples `sample_id`, `baf` and `coverage` are mandatory):

```
case_id: 'example_case_id'
display_case_id: 'GIAB Trio'
genome_build: 38
samples:
  - sample_id: 'hg002'
    baf: '/access/wgs/plot_data/hg002.baf.bed.gz'
    coverage: '/access/wgs/plot_data/hg002.cov.bed.gz'
    sample_type: 'proband'
    sex: 'M'
    meta_files:
      - '/access/wgs/plot_data/hg002.meta.tsv'
      - '/access/wgs/plot_data/hg002.chrom_meta.tsv'
    sample_annotations:
      - file: '/access/wgs/plot_data/hg002.gens_track.roh.bed'
        name: 'LOH'
      - file: '/access/wgs/plot_data/hg002.gens_track.upd.bed'
        name: 'UPS'
  - sample_id: 'hg004'
    baf: '/access/wgs/plot_data/hg004.baf.bed.gz'
    coverage: '/access/wgs/plot_data/hg004.cov.bed.gz'
    sample_type: 'mother'
    sex: 'F'
  - sample_id: 'hg003'
    baf: '/access/wgs/plot_data/hg003.baf.bed.gz'
    coverage: '/access/wgs/plot_data/hg003.cov.bed.gz'
    sample_type: 'father'
    sex: 'M'
```

Load with:

```
gens load case example_case.yaml
[2026-02-19 07:25:55,875] INFO in samples: Store sample hg002 in database
Loaded sample "hg002" with 2 meta file(s)
Loaded sample annotation "LOH" for sample "hg002"
Loaded sample annotation "UPS" for sample "hg002"
[2026-02-19 07:25:56,295] INFO in samples: Store sample hg004 in database
Loaded sample "hg004" with 0 meta file(s)
[2026-02-19 07:25:56,526] INFO in samples: Store sample hg003 in database
Loaded sample "hg003" with 0 meta file(s)
Finished loading case "example_case_id" with 3 sample(s), 2 meta file reference(s), and 2 sample annotation track(s)
```

### Sample metadata

(The current meta-data format will eventually be deprecated, and migrated to a simpler format. At first, this was intended to carry front-end information. Later we realized that the input meta better be data only.)

Metadata can be loaded from long-format TSV files using the `--meta` flag.

Metadata files are expected in long format (one entry per row).

Each file must contain `type` and `value` columns. A column not named `type`, `value`, or `color` is treated as the row-name header.

You can provide `--meta` multiple times in `gens load sample` to load several metadata files in a single command.

Example with row names:

```tsv
sample	type	value	color
first	A	valA	rgb(1,2,3)
second	B	valB	.
.	C	valC	rgb(4,5,6)
```

Example without row names (displayed as key-value pairs):

```tsv
type	value
gender	female
library	PCR-free
```

For example, to add metadata stored in two files, run:

```bash
gens load sample \
    --sample-id SAMPLE1 \
    --case-id CASE1 \
    --genome-build 38 \
    --baf SAMPLE1.baf.bed.gz \
    --coverage SAMPLE1.cov.bed.gz \
    --meta SAMPLE1_meta.tsv \
    --meta SAMPLE1_chr_meta.tsv
```

### Loading extra sample tracks

Additional tracks linked to a sample can be loaded separately (BED format).

```bash
gens load sample-annotation \
    --sample-id SAMPLE1 \
    --case-id CASE1 \
    --genome-build 38 \
    --file extra_track.bed \
    --name "CNV calls"
```

If a track with the same name already exists for that sample/case/build, add `--force` to overwrite without confirmation.

## Loading annotation tracks

Annotation tracks are stored in the database and can be loaded from BED, AED, or TSV files.

```bash
gens load annotations -b 38 -f /path/to/annotation_files
```

`--file` can point to either a single file or a directory. For directories, Gens processes files with `.bed`, `.aed`, or `.tsv` suffixes.

If a track with the same name already exists for the same genome build, old annotations are removed and replaced.

Useful options:

* `--tsv`: force TSV parsing regardless of filename suffix.
* `--ignore-errors`: continue parsing AED entries even if some entries fail.

### File formats


#### TSV format

Specific headers are required. Header matching is case-insensitive.

Mandatory columns:

* `chromosome`
* `start`
* `stop` (or `end`)

Non-mandatory columns:

* `name`
* `color` (Format: `"rgb(0,0,0)"`)
* `comments` (Multiple comments can be separated using ";")

Example:

```tsv
chromosome	start	stop	name	color	comments
1	809860	1565798	Region A	rgb(1,2,3)	A comment
1	852889	1616947	Region B	.	Another comment
X	10000	25000	Region C	rgb(4,5,6)	First; second
```

#### BED format

Follows the BED standard (https://en.wikipedia.org/wiki/BED_(file_format)). Required fields are:

* Chromosome (`col1`)
* Start (`col2`)
* End (`col3`)

Non-mandatory but useful fields are:

* Name (`col4`)
* Color (`col9`, format: `"rgb(0,0,0)"`)

Unused columns can be filled with dots (`.`).

Lines starting with comments are ignored.

Example:

```
# A bed 9 file following the BED v1 spec, https://samtools.github.io/hts-specs/BEDv1.pdf
# chrom	start	end	name	score	strand	thickStart	thickEnd	itemRgb
1	809860	1565798	.	.	.	.	.	0,0,255
1	852889	1616947	.	.	.	.	.	0,0,255

```

PAR example tracks are available in this repo:

* `docs/admin_guide/example_tracks/par_regions_hg38_pink.bed`
* `docs/admin_guide/example_tracks/par_regions_hg19_pink.bed`

Load one of them with:

```bash
# GRCh38 / hg38
gens load annotations -b 38 -f docs/admin_guide/example_tracks/par_regions_hg38_pink.bed

# GRCh37 / hg19
gens load annotations -b 37 -f docs/admin_guide/example_tracks/par_regions_hg19_pink.bed
```

#### AED format

AED is a custom format written by [ChAS](https://assets.thermofisher.com/TFS-Assets/LSG/manuals/ChAS_Manual.pdf).

### Loading annotations from UCSC

Download the DGV bigBed (`.bb`) track from [UCSC](https://genome.ucsc.edu/cgi-bin/hgTables?db=hg19&hgta_group=varRep&hgta_track=dgvPlus&hgta_table=dgvMerged&hgta_doSchema=describe+table+schema).

Convert bigBed to BED, keep relevant columns, and add headers according to the Gens TSV format. (`bigBedToBed` can be downloaded from [here](https://hgdownload.soe.ucsc.edu/admin/exe/linux.x86_64.v479/bigBedToBed)).

```
./bigBedToBed dgvMerged.bb dgvMerged.bed
cut -f1,2,3,4,9 dgvMerged.bed > dgvMerged.fivecol.bed
echo "Chromosome	Start	Stop	Name	Color" > header
cat header dgvMerged.fivecol.bed > DGV_UCSC_2023-03-09.bed
```

```bash
gens load annotations -b 37 -f /sources/gens-tracks/ --tsv
```

This should result in something like:
```
[2023-12-15 14:45:06,959] INFO in app: Using default Gens configuration
[2023-12-15 14:45:06,959] INFO in db: Initialize db connection
[2023-12-15 14:45:07,111] INFO in load: Processing files
[2023-12-15 14:45:07,112] INFO in load: Processing /home/proj/stage/rare-disease/gens-tracks/Final_common_CNV_clusters_0.bed
[2023-12-15 14:45:07,144] INFO in load: Remove old entry in the database
[2023-12-15 14:45:07,230] INFO in load: Load annotations in the database
[2023-12-15 14:45:07,309] INFO in load: Update height order
[2023-12-15 14:45:10,792] INFO in load: Processing /home/proj/stage/rare-disease/gens-tracks/DGV_UCSC_2023-03-09.bed
[2023-12-15 14:45:16,170] INFO in load: Remove old entry in the database
[2023-12-15 14:45:16,173] INFO in load: Load annotations in the database
[2023-12-15 14:45:41,873] INFO in load: Update height order
Finished loading annotations ✔
```
