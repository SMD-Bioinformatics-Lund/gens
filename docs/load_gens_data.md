# Chromosomes

# Genes

# Annotations

# Samples

# Sample annotations

# Sample meta data

Once installed you can load annotation data into Gens database using the included command line interface. 

``` bash
gens load --help
```

Gens requires the chromosome sizes to be loaded into the database. The repository includes the sizes for grch37 and grch38 in the utils folder.

To display transcripts these need to be loaded into the database.

``` bash
# download reference files
curl --silent --output ./Homo_sapiens.GRCh38.113.gtf.gz https://ftp.ensembl.org/pub/release-113/gtf/homo_sapiens/Homo_sapiens.GRCh38.113.gtf.gz
curl --silent --output ./MANE.GRCh38.v1.4.summary.txt.gz https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_1.4/MANE.GRCh38.v1.4.summary.txt.gz
# load files into database
gens load transcripts --file Homo_sapiens.GRCh38.113.gtf.gz --mane MANE.GRCh38.v1.4.summary.txt.gz -b 38
```

Annotated regions can be loaded into the database in either `bed` or `aed` format.



## Loading data into Gens

Load a sample into gens with the command `gens load sample` where you need to specify the sample id, genome build and the generated data files. **Note** that there sample id/ genome build combination needs to be unique. To use Gens simply navigate to the URL **hostname.com:5000/** to view a list of all samples loaded into Gens. To directly open a specific sample go to the URL **hostname.com:5000/<sample id>**.

## Loading reference tracks

FIXME: Walk through these steps

Download the DGV bb track from [UCSC](https://genome.ucsc.edu/cgi-bin/hgTables?db=hg19&hgta_group=varRep&hgta_track=dgvPlus&hgta_table=dgvMerged&hgta_doSchema=describe+table+schema).
Convert bigBed to Bed, cut relevant columns and name them according to Gens standard.

```
./bigBedToBed /home/proj/stage/rare-disease/gens-tracks/dgvMerged.bb dgvMerged.bed
cut -f1,2,3,4,9 dgvMerged.bed > dgvMerged.fivecol.bed
cat > header
Chromosome	Start	Stop	Name	Color
cat header dgvMerged.fivecol.bed > /home/proj/stage/rare-disease/gens-tracks/DGV_UCSC_2023-03-09.bed
```

```
gens load annotations -b 37 -f /sources/gens-tracks/
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
