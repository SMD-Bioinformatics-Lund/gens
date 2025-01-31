#!/bin/bash

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <dump folder>"
    exit 1
fi

dump_folder=$1

dc_cmd="docker compose -f docker-compose.yml -f docker-compose.dev.yml"

echo "Copying ${dump_folder}/scout and ${dump_folder}/gens into mongodb:/tmp ..."
${dc_cmd} cp "${dump_folder}/scout" mongodb:/tmp
${dc_cmd} cp "${dump_folder}/gens" mongodb:/tmp
echo "Copying ${dump_folder}/hg002 into gens:/tmp ..."
${dc_cmd} cp "${dump_folder}/hg002" gens:/tmp

echo "Loading Gens collections"
${dc_cmd} exec mongodb mongoimport --db gens --jsonArray /tmp/gens/annotations.dump
${dc_cmd} exec mongodb mongoimport --db gens --jsonArray /tmp/gens/chrom-sizes.dump
${dc_cmd} exec mongodb mongoimport --db gens --jsonArray /tmp/gens/transcripts.dump

echo "Loading Scout collections"
${dc_cmd} exec mongodb mongoimport --db scout --collection case --file /tmp/scout/hg002_case.json
${dc_cmd} exec mongodb mongoimport --db scout --collection variant --file /tmp/scout/hg002_case_variants.json

coverage="/tmp/hg002/hg002.cov.bed.gz"
baf="/tmp/hg002/hg002.baf.bed.gz"
overview="/tmp/hg002/hg002.overview.json.gz"
${dc_cmd} exec gens gens load sample --sample-id hg002 --case-id hg002-case --coverage "${coverage}" --baf "${baf}" --overview-json "${overview}" --genome-build 38
