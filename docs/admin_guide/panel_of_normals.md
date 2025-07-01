# Creating panel of normals

The panel of normals is used when calculating the coverage ratio for the samples as outlined in the section on [generating Gens data](./generate_gens_data.md).

## Command line

Create targets file:

``` bash
gatk PreprocessIntervals                            \
     --reference GRCh38.fa                          \
     --bin-length 100                               \
     --interval-merging-rule OVERLAPPING_ONLY       \
     -O targets_preprocessed_100bp.interval_list
```

Build a panel of normals (PON). First run this command for all bam files that you want to include in the PON. We have one PON for males and one for females. We have approx. 100 individuals of each sex in the PONs, but less should be fine.

``` bash
gatk CollectReadCounts                                  \
    -I sample1.bam                                      \
    -L targets_preprocessed_100bp_bins.interval_list    \
    --interval-merging-rule OVERLAPPING_ONLY            \
    -O hdf5/sample1.hdf5
```

Then build the PON. This is fairly memory intensive, so make sure you have enough memory and adjust the -Xmx if necessary.

``` bash
gatk --java-options "-Xmx120000m" CreateReadCountPanelOfNormals \
     --minimum-interval-median-percentile 10.0                  \
     --maximum-chunk-size 29349635                              \
     -O male_pon_100bp.hdf5                                     \
     -I hdf5/sample1.hdf5                                       \
     -I hdf5/sample2.hdf5                                       \
     ...
     -I hdf5/sample99.hdf5
```

## Nf-core pipeline

The nf-core pipeline [createpanelrefs](https://github.com/nf-core/createpanelrefs) can be used to prepare a panel of normals.
