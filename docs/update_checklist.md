# Gens update

## Prepare the testing PR

In the Gens repo, update the version in:

- [ ] `package.json`
- [ ] `__version__.py`

Do a PR and copy in this template.

## Repo setup

### Preparing the repo

- [ ] Clone the repo into a new folder

```
$ git clone git@github.com:SMD-Bioinformatics-Lund/gens.git gens_test
$ cd gens_test
```

- [ ] Link in the /dump data folder

This can be achieved by placing the `dump` folder in the repo and adding the following `docker-compose.override.yml`:

```
services:
  gens:
    volumes:
      - ./dump:/dump
  mongodb:
    volumes:
      - ./dump:/dump
```

The `dump` folder should contain:

* Scout db dump
  * `hg002_variants.json`
* Gens exports
  * `hg00[234].baf.bed.gz`
  * `hg00[234].baf.bed.gz.tbi`
  * `hg00[234].cov.bed.gz`
  * `hg00[234].cov.bed.gz.tbi`
  * `hg00[234].overview.json.gz`
* Annotation tracks
  * `annotation_tracks` (empty folder)

FIXME: Add meta data as well for hg002

In the moment of writing, this folder can be copied from: `/data/bnf/dev/jakob/data/gens_dump_hg002`.

Annotation tracks for testing can be copied from `/access/annotation_tracks`. Copy these into the folder `annotation_tracks` folder in the `dump` folder.

### Production settings for the front-end part

In `gens/webpack.config.cjs`:

- [ ] Set `mode: 'production'`

In `gens/tsconfig.json`:

- [ ] Turn off source map (used for debugging typescript): `sourceMap: false`
- [ ] Build and copy the web assets

```
$ npm run buildcp
```

### [Ready to Start](https://open.spotify.com/track/33X9miK4Xz7pNeVrc9RITG?si=585c6883db114395)

- [ ] Build and start the containers

```
$ docker-compose up -d --build
```

### Setup the Scout database

- [ ] Import the Scout hg002 variant collection into mongo

```
$ docker-compose exec mongodb /bin/bash
[mongodb] $ mongoimport --db scout --collection variant /dump/hg002_variants.json
```

# Testing the CLI

## Loading data

- [ ] Index the database

```
gens index
```

- [ ] Load chromosome info (retrieves information from the web).

```
[gens] $ gens load chromosomes --genome-build 38
```

- [ ] Load annotation track (aes, bed with header and bed without header)

```
gens load annotations --file /dump/annotation_tracks --genome-build 38
```

- [ ] Load transcripts

First, download / copy into the `dump` folder:

```
curl https://ftp.ensembl.org/pub/release-113/gtf/homo_sapiens/Homo_sapiens.GRCh38.113.gtf.gz
curl https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_1.4/MANE.GRCh38.v1.4.summary.txt.gz
```

Then load them into Gens:

```
gens load transcripts \
    --file /dump/Homo_sapiens.GRCh38.113.gtf.gz \
    --mane /dump/MANE.GRCh38.v1.4.summary.txt.gz \
    -b 38
```

- [ ] Load the HG002 sample

Using the exact name `hg002-2` here matters as it should match the variants for the Scout case previously loaded.

```
gens load sample \
    --sample-id hg002-2 \
    --case-id hg002-2 \
    --genome-build 38 \
    --baf /dump/hg002.baf.bed.gz \
    --coverage /dump/hg002.cov.bed.gz \
    --overview-json /dump/hg002.overview.json.gz \
    --sample-type proband \
    --sex M
```

Load the parents as well.

```
gens load sample \
  --sample-id hg003 \
  --case-id hg002-2 \
  --genome-build 38 \
  --baf /dump/hg003.baf.bed.gz \
  --coverage /dump/hg003.cov.bed.gz \
  --overview-json /dump/hg003.overview.json.gz \
  --sample-type father \
  --sex M

gens load sample \
  --sample-id hg004 \
  --case-id hg002-2 \
  --genome-build 38 \
  --baf /dump/hg004.baf.bed.gz \
  --coverage /dump/hg004.cov.bed.gz \
  --overview-json /dump/hg004.overview.json.gz \
  --sample-type mother \
  --sex F
```

# Testing the GUI

Some steps needs access to a Scout stack. Recommended to run this on the test data set up above, but can be tested on Gens dev as well.

The tasks are ripe for being automated using Cypress. Something to iterate on with future Gens updates.

## Sample page

- [ ] Are expected samples present?
- [ ] Does the case link to Scout work? (On PGM1)
- [ ] Is the version number displayed to the top left updated?

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/gens/refs/heads/dev/docs/img/samples.PNG" width="400px">

## About page

- [ ] Information about the last db update is shown
- [ ] Configuration settings are shown

## Single-chromosome page

Opening hg002. Does all tracks show up in the initial view?

- [ ] B allele frequency track
- [ ] Log2 ratio track
- [ ] Overview track
- [ ] Transcript track
- [ ] Annotation track
- [ ] Sample annotation track

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/gens/refs/heads/dev/docs/img/single.PNG" width=400 alt="Single sample single chromosome view">

Opening a trio case. Are the additional tracks there:

- [ ] B allele frequency tracks for mother / father
- [ ] Log2 ratio tracks for mother / father
- [ ] Hidden variant tracks for mother / father (seen in the tracks list in the settings menu)

Zooming in, and expanding tracks. Are details shown for the gene track?

- [ ] Transcript labels centered for the transcripts
- [ ] UTRs colored in gray

<img src="https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary-1200x675.webp" width=400 alt="Chromosomes view">

- [ ] Type "RNU4-2" into the search box. It should be localized in chromosome 12. Is it represented as a single blue block? (I.e. a non protein coding transcript)

<img src="https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary-1200x675.webp" width=400 alt="Chromosomes view">

### Context menus

Is content correctly displayed in the context menus for the different band tracks:

- [ ] Annotation track. Click a mimisbrunnr track.

<img src="https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary-1200x675.webp" width=400 alt="Chromosomes view">

- [ ] Variant bands
- [ ] Gene bands
- [ ] Sample annotation bands

### Navigation

- [ ] Panning (arrow buttons, left/right arrow keys, space + drag)
- [ ] Zooming (zoom buttons, up/down arrow keys, space + shift + drag)
- [ ] Direct navigation (writing a chromosome + region in the search box)
- [ ] Clicking the overview chart
- [ ] Clicking bands in the chromosome ideogram (top track)
- [ ] Tracks can be expanded / collapse by right click
- [ ] Highlight mode works
  - [ ] Toggle using pen button or M
  - [ ] Drag and put highlight
  - [ ] Open setting menu and find the highlight. Click and see if you navigate to it.
  - [ ] Try removing a highlight by hovering and pressing the "X"
- [ ] Rearrange tracks by clicking and dragging

### Meta data

- [ ] Meta page opens without console errors
- [ ] Meta page contains key-value information on proband
- [ ] Meta page contains chromosome table

<img src="https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary-1200x675.webp" width=400 alt="Multiple chromosomes view">

### Settings

- [ ] Persistent settings
  - [ ] Try adjusting track height
  - [ ] Assign mimisbrunnr as "Color tracks by"
  - [ ] Add another annotation track
  - [ ] Refresh the page. These settings should persist.
- [ ] Track settings
  - [ ] Open a dot track menu by clicking its label
  - [ ] Adjust the Y-axis. These changes should be shown directly in the viewer for that track.
  - [ ] Hide the track.
  - [ ] Navigate to the settings side menu. Unhide the track.
- [ ] Adding / removing samples
  - [ ] In the settings menu, try removing a sample. The corresponding tracks should be removed.
  - [ ] In the settings menu, try adding a sample. The corresponding tracks should be added at the bottom of the tracks.

## Multiple-chromosomes page

- [ ] Coverage for all chromosomes is shown correctly
- [ ] Sample annotation for chromosomes is shown correctly

<img src="https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary-1200x675.webp" width=400 alt="Multiple chromosomes view">

# Test on Gens dev

General sanity check and testing things that cannot be tested in a test setup.

- [ ] The sample list looks correct
- [ ] Opening a trio for the the single-chromosome view, all tracks are shown
  - [ ] Three cov tracks
  - [ ] Three BAF tracks
  - [ ] Variants for proband (parents hidden)
  - [ ] Sample annotations for proband
  - [ ] Gene track
- [ ] Variant context menu
  - [ ] Clicking variant links back to Scout

