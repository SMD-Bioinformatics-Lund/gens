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
