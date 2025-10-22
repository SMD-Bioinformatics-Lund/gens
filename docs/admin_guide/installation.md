# Setup

## Docker image (recommended)

Using docker, a simple demo and development instance of Gens can be launched with the command `docker compose up -d`.

Gens requires access to a directory where the `xxx.baf.bed.gz` and `xxx.cov.bed.gz` files are stored. This can be achived by mounting the directory. See sample docker-compose below.

```yaml
services:
  gens:
    volumes:
      - /path/to/gens_data:/access/wgs/hg38 # /path/on/host:/path/inside/container
```

The dockerized app consists of 2 containers, the Gens app and a lightweight MongoDB instance.

Once the server has started you can open the app in your web browser at [http://localhost:5000](http://localhost:5000).

To stop the instance use the command `docker-compose down`.

## Local installation

Gens requires python 3.11 or later and MongoDB. For testing or development purposes the easiest way to install it is to create a virtual environment:

```bash
git clone https://github.com/Clinical-Genomics-Lund/Gens.git
cd Gens
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .
```

You also need to build the javacript and css files and put them into the directory `gens/static/js` and `gens/static/css` respectively. To build the assets you need to have node installed on your system.

```bash
npm install
npm run sync
```

Start the application using an uvicorn service. For it to work this requires you to have MongoDB running on your system.

```bash
uvicorn gens.app:create_app --factory --reload --host 0.0.0.0 --port 5000
```

Make sure the application is running by loading http://localhost:5000/ in your web browser. If that works, head to http://localhost:5000/app to open the app itself or http://localhost:5000/docs to explore the API.

Finally you need to populate the databases with chromosome sizes and gene/transcript data (see more under section [Load data](./load_gens_data.md))
