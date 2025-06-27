# Installation

## Installation

Gens requires python 3.11 or later and mongodb. For testing/development purposes the easiest way to install it is to create a virtual environment:

``` bash
git clone https://github.com/Clinical-Genomics-Lund/Gens.git
cd Gens
virtualenv -p python3 venv
source venv/bin/activate
pip install .
```

You also need to build the javacript and css files and put them into the directory `gens/static/js` and `gens/static/css` respectively. To build the assets you need to have node installed on your system.
``` bash
# install build dependancies and build web assets.
npm install && npm run build
# copy built frontend gens/static
cp build/css/error.min.css gens/static/css/; cp build/css/home.min.css build/css/about.min.css build/css/landing.min.css gens/blueprints/home/static/; cp build/*/gens.min.* gens/blueprints/gens/static/
```

Start the application using:
``` bash
export FLASK_APP=gens.py && flask run
```

Make sure the application is running by loading http://localhost:5000/ in your web browser.

Finally you need to populate the databases with chromosome sizes and gene/transcript data. (See more under section [Load data](./load_gens_data.md))

### Docker image

Using docker, a simple demo and development instance of Gens can be launched with the command `docker compose run -d`.

Gens requires access to a directory where the `xxx.baf.bed.gz` and `xxx.cov.bed.gz` files are stored. This can be achived by mounting the directory. See sample docker-compose below.

``` yaml
services:
  gens:
    volumes:
      - /path/to/gens_data:/access/wgs/hg38  # /path/on/host:/path/inside/container
```

The dockerized app consists of 2 containers, the Gens app and a lightweight mongodb instance.

Once the server has started you can open the app in your web browser at [http://localhost:8080](http://localhost:8080).

To stop the instance use the command `docker-compose down`.
