# Generate Gens sample data

Gens uses a custom tabix-indexed bed file format to hold the coverage data used for plotting. This file can be generated in any way, as long as the format of the file is according to the specification. This section describes the method we use to create the data.

We are using the GATK4 workflow for normalizing the read depth data. It is described in detail [here](https://gatk.broadinstitute.org/hc/en-us/articles/360035531092?id=11682). 

## Calculate normalized read depth data

Use these commands to count and normalize the data of a sample, starting with a BAM file.

Instructions on creating the panel of normals (`male_pon_100bp.hdf5` in the command below) is found [here](./panel_of_normals.md).

``` bash
gatk CollectReadCounts                                              \
    -I subject.bam -L targets_preprocessed_100bp_bins.interval_list \
    --interval-merging-rule OVERLAPPING_ONLY -O subject.hdf5

gatk --java-options "-Xmx30g" DenoiseReadCounts                     \
    -I subject.hdf5 --count-panel-of-normals male_pon_100bp.hdf5    \
    --standardized-copy-ratios subject.standardizedCR.tsv           \
    --denoised-copy-ratios subject.denoisedCR.tsv
```

## Generate B-allele frequency (BAF) data

It is possible to use the GATK tools to create BAF data as well, but we have found it to be very slow and since we are already doing (germline) variant calling, we extract the BAF data from the gVCF.

## Reformatting the data for Gens

Once you have the standardized coverage file from GATK and a gVCF you can create Gens formatted data files using the command below. The script should accept any properly formatted gVCF but only output from GATK HaplotypeCaller and Sentieon DNAscope have been tested.

``` bash
utils/generate_gens_data.pl subject.standardizedCR.tsv subject.gvcf SAMPLE_ID gnomad_hg38.0.05.txt.gz
```

The script requires that **bgzip** and **tabix** are installed in a $PATH directory.

The final output should be two files named: **SAMPLE_ID.baf.bed.gz** and **SAMPLE_ID.cov.bed.gz**

A Python version of this script is available with argparse interface. This will eventually replace the Perl script shown above.

```python3
utils/generate_gens_data.py \
    --coverage hg002.standardizedCR.tsv \
    --gvcf hg002.dnascope.gvcf.gz \
    --label hg002 \
    --gnomad gnomad_hg38.0.05.txt \
    --outdir output
```

## Data format

If you want to generate the data in some other way than described above you need to make sure the data conforms to these standards.

Two data files for each sample are needed by Gens. One file for normalized read depth data, and one for B-allele frequencies (BAF). Both are bed files, with the exception that they have 5 different precalculatad levels of resolution. The different resolutions are represented in the bed-file by prefixing the chromosome names with **o**, **a**, **b**, **c**, **d** followed by an underscore. **o** represents the data for the static overview, where **a** represent the lowest interactive resolution and **d** the highest.

I.e. `b_2` means "zoom level B for chromosome 2".

```
o_1    1383799    1383800    -0.081
o_1    1483799    1483800    -0.120
...
a_1    1379199    1379200    -0.048
a_1    1404199    1404200    -0.088
...
b_1    1388999    1389000    0.018
b_1    1393999    1394000    -0.108
...
c_1    1386399    1386400    -0.136
c_1    1387399    1387400    -0.050
...
d_1    1386849    1386850    -0.340
d_1    1386949    1386950    -0.312
```

The fourth column values should be log2-ratio values (log2(depth/average depth)) for the read depth data and allele frequencies between 0.0 and 1.0 for BAF data.

The bin size for each resolution could be anything, but the if they are too small there will be too many points to load in a view (making things slow), if they are too big the points will be too sparse. Here are the bin sizes we're using:

| resolution level | bin size | # data points | # SNPs (BAF)     |
|------------------|----------|---------------|------------------|
| o                | 100,000  | 28,000        | 47,000           |
| a                | 25,000   | 110,000       | 188,000          |
| b                | 5,000    | 550,000       | 754,000          |
| c                | 1,000    | 2,700,000     | 1,900,000        |
| d                | 100      | 26,400,000    | 7,500,000        |


The **o** resolution is used only for the whole genome overview plot. The number of data points in this resolution really affects the time it takes to initially load a sample into Gens.

## Selection of SNPs for BAF data

We are using all SNPs in gnomAD with an total allele frequency > 5%, which in gnomAD 2.1 is approximately 7.5 million SNPs.

