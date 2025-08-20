# Gens update

## Prepare the testing PR

In the Gens repo, update the version in:

- [ ] `package.json`
- [ ] `__version__.py`

Do a PR and copy in this template.

## Repo setup

### Preparing the repo

- [ ] If needed - clone the repo into a new folder

```
$ git clone git@github.com:SMD-Bioinformatics-Lund/gens.git gens_test
$ cd gens_test
```

- [ ] Link in the /dump data folder

A "dump" folder with required files to setup a full trio, with references to Scout variants is available here: `/data/bnf/dev/jakob/data/gens_test_data`.

Furthermore, current annotation tracks for testing can be copied from `/access/annotation_tracks`. Copy these into the folder `annotation_tracks` folder in the `dump` folder. Note - some of these contain sensitive data. Test loading all as a final step when running on Gens dev.

```
# Note: ~1.6 GB
rsync --bwlimit 20000 -avPh Trannel:/data/bnf/dev/jakob/data/gens_test_data dump
rsync --bwlimit 20000 -avPh Trannel:/access/annotation_tracks/{Mimisbrunnr.Lund-hg38.aed,DECIPHER.DDG2P.250216-hg38.aed,IlluminaRL100.dark.gene.annotations-hg38.aed} test_dump/annotation_tracks
```

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
  * Sample data
    * `hg00[234].baf.bed.gz`
    * `hg00[234].baf.bed.gz.tbi`
    * `hg00[234].cov.bed.gz`
    * `hg00[234].cov.bed.gz.tbi`
    * `hg00[234].overview.json.gz`
  * HG002 meta data
      * `hg002.upd-roh.bed.gz`
      * `hg002.meta.tsv`
      * `hg002.chr_meta.tsv`
* Annotation tracks
  * `annotation_tracks`

If running the default configs, you might need to change the port of `gens_api_url` to `5000` in `config.toml`.

### Production settings for the front-end part

In `webpack.config.cjs`:

- [ ] Set `mode: 'production'`

In `tsconfig.json`:

- [ ] Turn off source map (used for debugging typescript): `sourceMap: false`
- [ ] Build and copy the web assets

```
$ npm run buildcp
```

### [Ready to Start](https://open.spotify.com/track/33X9miK4Xz7pNeVrc9RITG?si=585c6883db114395)

- [ ] Build and start the containers

```
$ docker compose -p gens_test up -d --build
```

### Setup the Scout database

- [ ] Import the Scout hg002 variant collection into mongo

```
$ docker compose -p gens_test exec mongodb /bin/bash
[mongodb] $ mongoimport --db scout --collection variant /dump/hg002_variants.json
```

# Testing the CLI

Access the CLI by:

```
docker compose -p gens_test exec gens /bin/bash
```

## Loading data

- [ ] Index the database

```
$ gens index
```

- [ ] Load chromosome info (retrieves information from the web).

```
$ gens load chromosomes --genome-build 38
```

- [ ] Try loading annotation tracks. This should load successfully. Warnings fine, crashes are not.

```
$ gens load annotations --file /dump/annotation_tracks --genome-build 38
```

- [ ] Load transcripts

First, download / copy into the `dump` folder:

```
# ~60MB
wget https://ftp.ensembl.org/pub/release-113/gtf/homo_sapiens/Homo_sapiens.GRCh38.113.gtf.gz
wget https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_1.4/MANE.GRCh38.v1.4.summary.txt.gz
```

Then load them into Gens:

```
gens load transcripts \
    --file /dump/Homo_sapiens.GRCh38.113.gtf.gz \
    --mane /dump/MANE.GRCh38.v1.4.summary.txt.gz \
    -b 38
```

- [ ] Load the HG002 sample

Using the exact name `hg002` here matters as it should match the variants for the Scout case previously loaded.

```
gens load sample \
    --sample-id hg002 \
    --case-id hg002 \
    --genome-build 38 \
    --baf /dump/hg002.baf.bed.gz \
    --coverage /dump/hg002.cov.bed.gz \
    --overview-json /dump/hg002.overview.json.gz \
    --sample-type proband \
    --sex M \
    --meta /dump/hg002.meta.tsv \
    --meta /dump/hg002.chr_meta.tsv
```

- [ ] Load the sample annotation track.

```
gens load sample-annotation \
    --sample-id hg002 \
    --case-id hg002 \
    --genome-build 38 \
    --file /dump/hg002.upd_roh.bed \
    --name "UPD and ROH"
```

- [ ] Load the father (hg003)

```
gens load sample \
  --sample-id hg003 \
  --case-id hg002 \
  --genome-build 38 \
  --baf /dump/hg003.baf.bed.gz \
  --coverage /dump/hg003.cov.bed.gz \
  --overview-json /dump/hg003.overview.json.gz \
  --sample-type father \
  --sex M
```

- [ ] Load the father (hg004)

```
gens load sample \
  --sample-id hg004 \
  --case-id hg002 \
  --genome-build 38 \
  --baf /dump/hg004.baf.bed.gz \
  --coverage /dump/hg004.cov.bed.gz \
  --overview-json /dump/hg004.overview.json.gz \
  --sample-type mother \
  --sex F
```

# Testing the GUI

Perform the tests with an open web console. Log messages are OK. Errors are usually not.

## Sample page

- [ ] Are expected samples present?
- [ ] Is the version number displayed to the top left updated?

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/gens/refs/heads/dev/docs/img/samples.PNG" width="400px">

## About page

- [ ] Information about the last db update is shown
- [ ] Configuration settings are shown

## Single-chromosome page

Opening hg002. Does all tracks show up in the initial view?

- [ ] Chromosome ideogram
- [ ] Position track
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

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/update_checklist/genes_view.PNG" width=400 alt="Genes zoomed in">

- [ ] Type "RNU4-2" into the search box. It should be localized in chromosome 12. Is it represented as a single blue block? (I.e. a non protein coding transcript)

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/update_checklist/rnu4_2.PNG" width=400 alt="RNU zoomed in">

### Context menus

Is content correctly displayed in the context menus for the different band tracks:

- [ ] Annotation track. Add mimisbrunnr. Click the first large band at chromosome 1. Does the content look sane. In particular check the comments and metadata parts.

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/update_checklist/mimis_annots.PNG" width=400 alt="Mimis side menu">

- [ ] Variant bands. Does the content look sane?
- [ ] Gene bands. Does the content look sane?
- [ ] Sample annotation bands. Does the content look sane?

### Navigation

- [ ] Panning (arrow buttons, left/right arrow keys, space + drag)
- [ ] Zooming (zoom buttons, up/down arrow keys, space + shift + drag)
- [ ] Direct navigation (writing a chromosome + region in the search box)
- [ ] Clicking the overview chart
- [ ] Clicking bands in the chromosome ideogram (top track)
- [ ] Tracks can be expanded / collapse by right click
- [ ] Highlight mode works
  - [ ] Toggle using pen button or M
  - [ ] Add some highlights
  - [ ] Open setting menu and find the highlight. Click and see if you navigate to it.
  - [ ] Try removing a highlight by hovering and pressing the "X"
- [ ] Rearrange tracks by drag and drop

### Meta data

- [ ] Meta page opens without console errors
- [ ] Meta page contains key-value information on proband (%ROH)
- [ ] Meta page contains chromosome table
- [ ] Drag the edge to expand and show the full table.

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/update_checklist/meta_side_page.PNG" width=400 alt="Meta">

### Settings

- [ ] Track settings
  - [ ] Open a dot track menu by clicking its label
  - [ ] Adjust the Y-axis. These changes should be shown directly in the viewer for that track.
  - [ ] Hide the track.
  - [ ] Navigate to the settings side menu. Unhide the track.
- [ ] Adding / removing samples
  - [ ] In the settings menu, try removing a sample. The corresponding tracks should be removed.
  - [ ] In the settings menu, try adding a sample. The corresponding tracks should be added at the bottom of the tracks.
- Try changing the variant threshold to 6. More bands should appear in chromosome 1.
- Try updating the default Y-axis range and click apply. All coverage tracks should change Y-axis.
- [ ] Persistent settings
  - [ ] Try adjusting track height
  - [ ] Assign mimisbrunnr as "Color tracks by"
  - [ ] Add another annotation track
  - [ ] Expand / collapse annotation tracks and the gene track
  - [ ] Refresh the page. These settings should persist.

## Multiple-chromosomes page

- [ ] Coverage for all chromosomes is shown correctly
- [ ] Sample annotation for chromosomes is shown correctly

<img src="https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/gens/refs/heads/dev/docs/img/chromosome_view.PNG" width=400 alt="Multiple chromosomes view">

# Test on Gens dev

## CLI

- [ ] Try loading all the annotation tracks and make sure it completes without errors.

```
gens load annotations --file /access/annotation_tracks/ --genome-build 38
```

## UI

General sanity check and testing things that cannot be tested in a test setup.

- [ ] The sample list looks correct
- [ ] Does the case link to Scout work? (On PGM1)
- [ ] Opening a trio for the the single-chromosome view, all tracks are shown
  - [ ] Three cov tracks
  - [ ] Three BAF tracks
  - [ ] Variants for proband (parents hidden)
  - [ ] Sample annotations for proband
  - [ ] Gene track
- [ ] Variant context menu
  - [ ] Clicking variant links back to Scout


