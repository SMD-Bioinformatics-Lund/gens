# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/)

About changelog [here](https://keepachangelog.com/en/1.0.0/)

## TBD

- Skip missing genotype variants in `generate_gens_data.py` [#588](https://github.com/SMD-Bioinformatics-Lund/gens/pull/588)

## 4.3.3

### Fixed

- Fix issue "Color tracks by" bands did not update when a new chromosome was selected [#584](https://github.com/SMD-Bioinformatics-Lund/gens/pull/584)
- Fix issue where the dockerfile for `generate_gens_data.py` could not be run in Nextflow pipeline due to missing `ps` command [#585](https://github.com/SMD-Bioinformatics-Lund/gens/pull/585).

## 4.3.2

### Added

- Extended unit test suite for `generate_gens_data.py` with an end-to-end test [#580](https://github.com/SMD-Bioinformatics-Lund/gens/pull/580).

### Fixed

- Updated the `Dockerfile` for `generate_gens_data.py` to support the Python version used in Gens [#578](https://github.com/SMD-Bioinformatics-Lund/gens/pull/578).
- Updated f-string syntax in `generate_gens_data.py` to avoid using nested double quotes (only supported since Python 3.12) [#580](https://github.com/SMD-Bioinformatics-Lund/gens/pull/580).

## 4.3.1

### Changed
- Changed the BAF position parameter for `generate_gens_data.py` from `--gnomad` to `--baf_positions`. Clarified it in the docs. Added a downloadable example file based on positions having > 5% frequency in Gnomad [#576](https://github.com/SMD-Bioinformatics-Lund/gens/pull/576).

### Fixed

- CLI modules defaults to INFO level log and can be adjusted by environment variable [#573](https://github.com/SMD-Bioinformatics-Lund/gens/pull/573).
- Added support for parsing chr-prefixed in data to `generate_gens_data.py` [#576](https://github.com/SMD-Bioinformatics-Lund/gens/pull/576).
- Extend CLI interface so the user can control whether to write bgzip+tabix output, number threads used for bgzip and BAF coverage depth threshold in `generate_gens_data.py` [#576](https://github.com/SMD-Bioinformatics-Lund/gens/pull/576).

## 4.3.0

### Added

- Support for exporting and importing profile settings (https://github.com/SMD-Bioinformatics-Lund/gens/pull/562).

### Changed

- Confirm track heights updates with button rather than directly with number changes (https://github.com/SMD-Bioinformatics-Lund/gens/pull/569).

### Fixed

- Chromosome does not respond to zooming in the track view (https://github.com/SMD-Bioinformatics-Lund/gens/pull/561).
- Sample caching now considers what case it belongs to. Before if having multiple samples with the same ID from different cases, the caches would not distinguish them (https://github.com/SMD-Bioinformatics-Lund/gens/pull/566).
- Fix query for getting sample-specific variants (https://github.com/SMD-Bioinformatics-Lund/gens/pull/568).

## 4.2.0

### Added

- ClinVar IDs (VCV, RCV) are detect in annotation text and automatically made into URLs. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/512)
- Add `--baf` and `--coverage` flags to `gens update sample` CLI command. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/518)
- Allow using sample types T/N as aliases for tumor/normal. They are stored internally as "tumor" and "normal". (https://github.com/SMD-Bioinformatics-Lund/gens/pull/518)
- IndexedDB caching of loaded transcripts (https://github.com/SMD-Bioinformatics-Lund/gens/pull/526)
- Automatically store and reuse layouts, i.e. what tracks are shown, collapsed and their order (https://github.com/SMD-Bioinformatics-Lund/gens/pull/529).
- Store layouts and other stored settings together in profiles, calculated based on what types of samples are present (https://github.com/SMD-Bioinformatics-Lund/gens/pull/550).
- Bring back the brief help text and help menu from Gens version 3 (https://github.com/SMD-Bioinformatics-Lund/gens/pull/539)
- Option to select main sample among the currently loaded samples. This is used for displaying the overview chart and the chromosome view. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/543)

### Changed

- Add a small padding at sides when navigating to a gene or annotation through search. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/516)
- Default hide advanced settings behind a toggle button. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/517)
- Raise an error if attempting to load samples where the cov or baf files (and tbi files) are not present. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/518)
- Removed default annotation track setting (https://github.com/SMD-Bioinformatics-Lund/gens/pull/526)
- Generalize connection with Scout using an abstract class as interface, opening for interfacing with other alternative variant software (https://github.com/SMD-Bioinformatics-Lund/gens/pull/526)
- Refactored track classes to work from track settings arrays living in the session class, rather than having state inside the track classes themselves (https://github.com/SMD-Bioinformatics-Lund/gens/pull/529)
- Show max and min y values for collapsed dot tracks (https://github.com/SMD-Bioinformatics-Lund/gens/pull/541)
- Show a thicker center line for cov tracks (https://github.com/SMD-Bioinformatics-Lund/gens/pull/541)

### Fixed

- Coloring of heterozygote variants now uses correct colors. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/514)
- Start on zoom-level "a" for tracks instead of showing the overview dots also for the tracks. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/515)
- Intron numbering OK also for reverse strand transcripts (https://github.com/SMD-Bioinformatics-Lund/gens/pull/539)
- Boxpadding for sample info drawer, to prevent truncating at the bottom (https://github.com/SMD-Bioinformatics-Lund/gens/pull/539)
- Fix such that the same Gens port is used for dev and prod configs (5000), avoiding having to reconfigure during release testing (https://github.com/SMD-Bioinformatics-Lund/gens/pull/544)
- A change in annotation db does no longer crash the load due to expecting pre-selected annotations to be there. These preselections are instead dropped with a (console) warning. (https://github.com/SMD-Bioinformatics-Lund/gens/pull/548)
- When pressing shift or control, the cursor immediately switches to zoom indication (https://github.com/SMD-Bioinformatics-Lund/gens/pull/549)
- When zooming in and out, the heights of the band tracks are updated to reflect the number of shown bands (https://github.com/SMD-Bioinformatics-Lund/gens/pull/549)
- Admin page instructions updated to keep them up to date with the recent updates of Gens (https://github.com/SMD-Bioinformatics-Lund/gens/pull/552)

## 4.1.0

### Added

- Updated default coverage Y-axis range can be directly applied with a button click
- Coverage Y-axis range is reflected also in the chromosome view
- Variant score threshold can be adjusted
- Variants are colored both per type (dup/del) and genotype, i.e. CN0, CN1, CN2, CN3+ have different colors
- Persist expansion state (i.e. collapsed or expanded) for annotation tracks and variant track
- Fallback to displaying Ensembl canonical when MANE and MANE plus transcripts aren't available for a gene

### Changed

- Removed unused coveralls GitHub workflows automation

### Fixed

- Direct links to regions now works also for regions within non numeric chromosomes (i.e. X and Y)
- Samples with underscore (\_) in their name can now be added through settings

## 4.0.0

### Added

- Tracks expand with wider window size.
- Tracks retrieve data on demand and caches requests.
- Multiple annotation tracks.
- Context menu when clicking band tracks.
- Highlight regions and see these highlights across all the position tracks.
- View multiple coverage tracks for samples within a case.
- Renderings are debounced and keep track of the last render such that they not double-render
- Tracks can be shown / hidden, collapsed and moved
- Tracks menu and customize Y-axis
- Drag and drop of tracks
- Color background of all data tracks based on bands from an annotation track
- Simple data table to display sample list, allowing search and sorting
- Navigate to position by clicking ideogram bands
- Add any additional sample to an ongoing session
- Track heights are customizable
- Multiple-chromosomes view
- Parsing AED files can deal with " surrounded comments split across multiple rows
- Optional sample type introduced (tumor/normal, proband/mother/father, other). Used in multi-sample views to display only proband-relevant tracks.
- Configure the "main sample types" through `main_sample_types` settings in the config
- Optional sample sex attribute (M/F) for samples.
- Load and display meta data in right hand table.
- Pydantic validation of loaded transcripts
- Add optional sample annotations. These can be loaded using CLI and displays additional band annotation linked to a sample.
- Persistent session state for annotation selection, annotation color, track heights and coverage Y range.
- Add end-to-end unit testing for CLI commands.
- Comments similar to those in aed format can be supplied in tsv format.
- Gens logo in browser tabs.
- Checklist to run through when doing releases.

### Changed

- Resolution increased 2x for tracks.
- Tracks are dynamic, meaning that they can be created and removed on run-time.
- Migrated from Connexion to FastAPI.
- Changed API routes and the underlying data structure for samples, annotations and transcripts.
- Updated CLI command for loading annotations.
- Remove height order from backend.
- Gens usage documentation added. Admin documentation also updated.
- Rewrite the data loading scripts into a single Python script.

### Fixed

- If no overview file is supplied, Gens will fall back to o level zoom in the cov/baf files
- Multi-line entries in aed header allowed

## 3.1.0

### Added

- User can specify path to a custom config file with the env `CONFIG_FILE`.
- Added test for the cli command `gens load annotations`.
- Use pydantic-settings for settings validation.
- Add linting to CI github workflow
- Temporary HG002 quick-setup script in utils. Requires mongo-dumps currently not part of the Gens repo. Will be replaced by a general setup script ahead.
- load transcripts can also read gzipped files

### Changed

- Settings now uses submodels for oauth and database connections
- Migrated from setup.py to pyproject.toml using hatchling
- Updated python to version 3.12 and thawed some dependencies.
- Switched from JS to TS and updated required parts of the build chain.
- For strand information, "" is interpreted as unknown and assigned "."
- Genome builds are dealt with as integers also for annotation tracks (previously these had been encoded as strings)
- Replaced the temporary hard-coded to HG002 setup script with the more flexible "utils/quick_setup.py", able to take many samples and annotations
- Rename `gens load chromosome-info` command to `gens load chromosomes` (#265)
- Disable multitrack loads as loading all transcripts data resulted in large network traffic and waiting times (#265)

### Fixed

- Fixed parsing of AED and BED files.
- Minor cleanup of `get-multiple-coverages` function.
- Resolved all type errors from tsc
- Initial type hints added to command and db modules
- Remove unused file argument for load chromomsome info CLI command
- Fixed various issues raised by pylint
- mypy type fixing for `mypy gens/commands/load.py`
- Refactor load transcripts
- Fix `gens delete sample` command by making it take the correct int formatted genome build number
- Refactor CLI sample functions to work with a Gens collection rather than accessing the db globally
- Resolve OAuth issue
- tsconfig.json copied into Dockerfile (#265)
- Smaller size for the Gens logo - as it did not fit within screen on smaller laptop screens (#265)
- Color in front-end formatter to deal with the new [0, 0, 0] format (compared to the previous "rgb(0,0,0)" format) (#265)
- Shift start position +1 in bed and aed files to make the annotations align with the 1-indexed format used elsewhere in Gens (#265)

## 3.0.1

### Changed

- Added files for setting up development and deployment-like instances.
- Throw an error when trying to open a sample without providing a case id.

### Fixed

- Fixed issue that prevented parsing of bed files.
- `gens index` command now respects the answer of the confirmation prompt.
- Fixed logo path in the navbar
- Index for case_id and no longer unique requirement for sample_id in index

## 3.0.0 - Merging Solnas and Lunds changes

### Added

- `--force` flag to `gens loads sample` for overwriting any existing sample in case of key conflict.
- `--force` flag prints a warning to stderr when overwriting an existing sample.
- `gens delete sample` command
- Height ordering for variants track.

### Fixed

- Pan able to exit chrosome when using genome build 17
- `--force` flag `update_one` call not being called properly
- Incorrect total sample count on home page.
- Some typos and documentation.
- Labels often not being visible on larger variants.

### Merged for Solna from Lund 2.1.2

#### Changed

- Changed cached method from simple to file system as it would be thread safe

#### Fixed

- Fixed cache issue that could result in chromosome information not being updated
- Fixed max arg error when searching for some genes
- Fixed bug that prevented updating annotation tracks

## [2.3 (Solna)]

### Added

- Link out to Scout: introduce config variable for base URL
- Link out to Scout: case links on home sample list
- Link out to Scout: click variant to open Scout page

### Changed

- Archive prod docker image with release tag name. Update action versions.

### Fixed

- Error image background static path
- GitHub action DockerHub push on release

## [2.2 (Solna)]

### Added

- Document track processing and loading
- OAuth authentication

### Changed

- Use sample id instead of display name for variant retrieval
- Hide balanced variants
- Keyboard pan speed increased
- Don't shrink pan window when attemting to pan over start

## [2.1.1b (Solna)]

### Added

### Changed

- Changes the main view's page title to be `sample_name` and adds `sample_name` and `case_id` to the header title
- Updated external images used in GitHub actions, including tj-actions/branch-names to v7 (fixes a security issue)
- Updated Python and MongoDB version used in tests workflow to 3.8 and 7 respectively

## [2.1.1 (Solna)]

### Added

### Changed

- Updated flask and pinned connexion to v2
- Updated node version of github action to 17.x

### Fixed

- Fixed annotation tracks being hidden behind other elements
- Use sample id as individual id to link out from Gens home sample list
- Some fixes from MHKC CG-Lund, e.g. status codes and a JSON error
- Removes some leading `/` that were breaking links
- Increased contrast of region selector
- Chromosome bands are displayed properly

## [2.1.2 (Lund)]

### Added

### Changed

- Changed cached method from simple to file system as it would be thread safe

### Fixed

- Fixed cache issue that could result in chromosome information not being updated
- Fixed max arg error when searching for some genes

## [2.1.1 (Lund)]

### Added

### Changed

- Updated flask and pinned connexion to v2
- Updated node version of github action to 17.x

### Fixed

- Fixed annotation tracks being hidden behind other elements
- Increased contrast of region selector
- Chromosome bands are displayed properly

## [2.1.0]

### Added

- Added seperate error page for when accessing a sample not in the database
- load chromosome-info stores centromere position and cyto band info
- Display viewed chromosome region in cytogenetic ideogram figure

### Changed

### Fixed

- Can now display samples that doesnt have data on all chromosomes

## [2.0.1]

### Added

### Changed

- Do not warn when using default configuration
- Renamed cli gens load chrom-sizes to gens load chromosome-info
- Removed gens load chromosome-info dependancy on additional files

### Fixed

- Missing tbi files now returns 404 status code
- Fixed sort order of samples table
- Prevent "internal error" when trying to access sample not in database

## [2.0.0]

### Added

- Command line interface for manageing Gens
- Commands for loading transcripts, annotations and chromosome size into database
- Include api spec, html and static files in distribution
- Display when databases last updated in /about.html
- Display current configuration /about.html
- Added landing page that show uploaded samples
- Added load sample command for loading samples into gens database
- Added index command for creating new indexes
- Added view sample command for displaying sample information
- Added pagination samples table

### Changed

- Changed development status from Alpha to Stable
- Samples are loaded based on the paths given when uploading the sample
- Gens no longer uses HG38_PATH and HG37_PATH variables
- Use genome build instead of hg_type throughout the codebase and in API calls

### Fixed

- Fixed typo in variable name

## [1.2.1]

### Added

- Reinstated tooltips to display additional information on genetic elements

### Changed

- Use popper for positioning tooltips
- Prettier for code formatting

### Fixed

## [1.2.0]

### Added

- Added github workflow for running pytest on PRs
- Added unit tests
- Added labels to the annotation tracks
- Added js unit tests with jest and linting with eslint

### Changed

- Changed positive strand color of transcripts to a more constrasting color
- Temporarily disabled on hover popups in annotation tracks
- Transcripts are represented as arrows in lower resolutions
- Highlight MANE transcript in name and with a brighter color
- Annotaion tracks are disabled if api returns an error at some point
- Annotation track DOMs are constructed with template macros
- Don't show "Loading..." when panning the interactive view with the mouse
- Changed default chromosome region to display to entire chromosome 1
- Restored ability to view entire chromosome when zoomed in by clicking on it in the chromosome overview.
- Build js package with webpack instead of gulp
- Remove dependency on three.js

### Fixed

- Gene names are now centered below transcript
- Fixed assignement of height order when updating transcript data
- get-variant-data returns 404 if case cant be found
- Hide trancscript tracks when requesting new data from api
- Fixed alignment of annotation tracks near chromosome end

## [1.1.2]

### Added

- Added error pages for 404, 416, 500 and missing samples
- Added `watch` cmd to `npm run` to launch a gulp server watches and updates js/css assets
- Shift - Click now Zoom in

### Changed

- Refactored page definitions into blueprint module
- Removed entrypoint script

### Fixed

- Navigation shortcuts does not trigger in text fields
- Fixed crash when searching for only chromosome
- Restored ability to search for transcripts by gene name
- Fixed crash when Shift - Click in interactive canvas
- Fixed checking of api return status in drawInteractiveContent
- Aligned highlight in interactive canvas
- Bumped Three to version 0.125.0

## [1.1.1]

### Fixed

- Reincluded gunicorn in docker image

## [1.1.0]

### Added

- Runnable Gens development environment in docker
- Added Change log document
- Added development environment
- Set default annotation file with annotation="name" url argument
- Added tack with variants from the Scout database where the selected variant is highlighted
- Github action to enforce the use of a changelog
- Described Gens APIs in openAPI specification file
- Add possibility to load overview data from a JSON, which substantially improves initial load times.
- Ctrl + Mouse click in interacive canvas zooms out
- Shift + Mouse to select a region in the interactive canvas to zoom in on
- Annotation tracks pan with the coverage track
- Annotation tracks are rendered by blitting sections from an offscreen canvas
- Added logo to README and Gens webpage

### Changed

- Added description on how to use the containerized version of Gens
- Replaced print statements with logging to stderr
- Refactored Gens as a python package
- Updated `start.sh` to work with packaged Gens
- Improved loading of genome overview track
- Made Gens (and db update scripts) read db configuration from env variables
- Increased the expanded annoation track width to 300px
- All annotations are allways being displayed
- Eliminate use of offScreenCanvas in order to support Firefox/Gecko
- Removed select region to zoom functionality from overview canvas
- Dropped jquery as a dependency
- General GUI updates

### Fixed

- Replaced depricated `update()` with `update_one()` in `update_transcripts.py`.
- Adjust the "Loading..." div to avoid drawing it above UI elements
- Made SASS more readable

## [1.0.0]

### Added

- Initial release of Gens
