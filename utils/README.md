## `generate_gens_data.py`

To build and publish the Docker container

From base folder. The second command will reuse the layers from the first, so only one container is built.

```
docker build -f utils/Dockerfile -t clinicalgenomicslund/generate_gens_data:<version> .
docker build -f utils/Dockerfile -t clinicalgenomicslund/generate_gens_data:latest .
docker push clinicalgenomicslund/generate_gens_data:<version>
docker push clinicalgenomicslund/generate_gens_data:latest
```

To then get a singularity container, simply do:

```
singularity pull docker://clinicalgenomicslund/generate_gens_data:<version>
```

## `normalize_coverage_without_pon.py`

This script can be used to self-normalize coverage data, i.e. instead of adjusting it to a panel of normal (PON), just scale it to its own median and calculate fold changes compared to this median.

This is primarily useful for QC checking, for instance to understand the profiles of the samples from which you are building your PON.

## `generate_roh_and_upd_tracks.py`

Generates per-sample ROH and UPD tracks based on ROH output from `bcftools roh` (https://samtools.github.io/bcftools/howtos/roh-calling.html) and UPD output from `upd` (https://github.com/bjhall/upd).

Generates meta tables based on Copy ratio output from GATK's `CollectReadCounts+DenoiseReadCounts`.

Should really be split into two or more smaller scripts. Bringing it over as-is from the pipeline to keep it mainly in the Gens repo.

See how it is used in https://github.com/SMD-Bioinformatics-Lund/nextflow_wgs for more information (currently named `prepare_gens_v4_input.py` over there, will be harmonized with the name in this repo).

