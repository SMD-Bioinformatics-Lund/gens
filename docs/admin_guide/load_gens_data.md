# Loading data into Gens

Once installed you can load annotation data into Gens database using the included command line interface. 

``` bash
gens load --help
```

## Chromosome sizes

Gens requires the chromosome sizes and information about bands and centromeres to be loaded into the database. Running the load command automatically retrieves the chromosome sizes. The data is downloaded from Ensembl.

```bash
gens load chromosomes --genome-build 38
```

This will fetch the karyotype for the selected build and replace any previous entries.

## Gene information

Genes and transcripts are loaded from a reference GTF together with a MANE summary. Download the files for the genome build you plan to use and run the loader.

``` bash
# download reference files
curl --silent --output ./Homo_sapiens.GRCh38.113.gtf.gz https://ftp.ensembl.org/pub/release-113/gtf/homo_sapiens/Homo_sapiens.GRCh38.113.gtf.gz
curl --silent --output ./MANE.GRCh38.v1.4.summary.txt.gz https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_1.4/MANE.GRCh38.v1.4.summary.txt.gz
# load files into database
gens load transcripts --file Homo_sapiens.GRCh38.113.gtf.gz --mane MANE.GRCh38.v1.4.summary.txt.gz -b 38
```

Annotated regions can be loaded into the database in either `bed` or `aed` format.

## Loading samples into Gens

Each sample requires a coverage file and BAF file (both tabix indexed). Provide a sample ID, case ID and genome build when loading. 

Sample type (proband/mother/father, tumor/normal) is needed in cases with multiple samples for Gens to understand what sample to handle as the "main" sample (i.e. display at top, show in overview plot / multi-chromosome view).

Sex is not required but might enable optional functionalities in the future (such as adjusting sex chromosome coverage).

Input files can be generated from the standardized coverage output and the gVCF as described in the [generate sample data](./generate_gens_data.md) part of the README. The script creates a pair of tabix indexed fiels named `<SAMPLE_ID>.cov.bed.gz` and `<SAMPLE_ID>.baf.bed.gz` to be loaded into Gens.

```bash
gens load sample \
    --sample-id hg002 \
    --case-id giab-trio \
    --genome-build 38 \
    --baf /path/to/baf.bed.gz \
    --coverage /path/to/coverage.bed.gz \
    --overview-json /path/to/overview.json.gz \
    --sample-type proband \
    --sex M
```

### Sample meta data

Additionally, meta data can be loaded from long-format tsv files using the `--meta` flag.

Metadata files are TSV formatted. Currently, the data is expected in long format, i.e. one entry per row. Wide-format might be more user friendly. Something for the future.

They must contain at least the columns `type` and `value`. A column not named `type`, `value` or `color` is treated as the row name header.

Example with row names:

```tsv
sample type value color
first  A    valA  rgb(1,2,3)
second B    valB  .
.      C    valC  rgb(4,5,6)
```

Example without row names (displayed as key-value pairs):

```tsv
type     value
gender   female
library  PCR-free
```

For example, to add metadata stored in `SAMPLE1_meta.tsv`, run:

```bash
gens load sample \
    --sample-id SAMPLE1 \
    --case-id CASE1 \
    --genome-build 38 \
    --baf SAMPLE1.baf.bed.gz \
    --coverage SAMPLE1.cov.bed.gz \
    --meta SAMPLE1_meta.tsv
```

### Loading extra sample tracks

Additional tracks linked to a sample can be loaded similarly to the annotation tracks.

```bash
gens load sample-annotation \
    --sample-id SAMPLE1 \
    --case-id CASE1 \
    --genome-build 38 \
    --file extra_track.bed \
    --name "CNV calls"
```

## Loading annotation tracks

Annotation tracks are stored in the database and can be provided as BED, AED or TSV files.

```bash
gens load annotations -b 38 -f /path/to/annotation_files
```

If a track with the same name already exists in the database, its annotations are removed and the track metadata is updated with the new information.

### File formats


#### Tsv format

Specific headers are required. Optional columns are read by name. Case insensitive.

Mandatory columns:

* `chromosome`
* `start`
* `stop` (Or `end`)

Non-mandatory columns:

* `color` (Format: `"rgb(0,0,0)"`)
* `comments` (Multiple comments can be separated using ";")

Example:

```
sample	type	value	color		comments
first	A	valA	rgb(1,2,3)	A comment
second	B	valB	.		Another comment
.	C	valC	rgb(4,5,6)	First; second
```

#### Bed format

Follows the bed-standard (https://en.wikipedia.org/wiki/BED_(file_format)). Required fields are:

* Chromosome (col1)
* Start (col2)
* End (col3)

Non-mandatory but useful fields are:

* Name (col4)
* Color (col9, format: `"rgb(0,0,0)"`)

Non-used columns can be filled with dots ".".

Lines starting with comments are ignored.

Example:

```
# A bed 9 file following the BED v1 spec, https://samtools.github.io/hts-specs/BEDv1.pdf
# chrom	start	end	name	score	strand	thickStart	thickEnd	itemRgb
1	809860	1565798	.	.	.	.	.	0,0,255
1	852889	1616947	.	.	.	.	.	0,0,255

```

#### Aed format

This is a custom format written by [ChAS](https://assets.thermofisher.com/TFS-Assets/LSG/manuals/ChAS_Manual.pdf).

### Loading annotations from UCSC

Download the DGV bb track from [UCSC](https://genome.ucsc.edu/cgi-bin/hgTables?db=hg19&hgta_group=varRep&hgta_track=dgvPlus&hgta_table=dgvMerged&hgta_doSchema=describe+table+schema).

Convert bigBed to Bed, cut relevant columns and name them according to Gens standard. (bigBedToBed can be downloaded from [here](https://hgdownload.soe.ucsc.edu/admin/exe/linux.x86_64.v479/bigBedToBed)).

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
