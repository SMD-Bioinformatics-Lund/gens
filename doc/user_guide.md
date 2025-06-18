# User guide

## The samples page

The start page lists all samples found in the database. From here you can open a single sample or all samples within a case. A search field helps locating specific entries. Each row includes a link to open the sample in an external software when such
integration is configured.

![Samples page](img/samples.PNG)

FIXME

* Adding / removing samples
* Change Y-axis range

## The sample viewer

After clicking a sample on the samples page, its tracks are opened in the sample viewer.

### The main views

The view of a single sample.

The tracks are:

* hg002 baf: B Allele Frequency
* hg002 cov: Log2 coverage ratio
* hg002 Variants: Filtered SV variants from external software (here from Scout)
* Mimisbrunnr: Annotation track. Multiple annotation tracks can be selected through the settings page (FIXME: see more below)
* UPD & ROH: Custom sample track, here with UPDs and ROHs calculated for the sample outside Gens and loaded together with the sample.

![Single](img/single.PNG)

Red dots in the coverage plot are outside the specified Y-range. To not hide this data, they are included in red at the edge of the plot.

![Red dots](img/red_dots.PNG)

When opening a full case, the view is similar, but will display BAF and coverage tracks for all included samples. Variant tracks for non-proband (i.e. mother / father) are available but hidden by default. Then can be shown in the settings menu (FIXME: see below).

![Trio](img/trio.PNG)

Clicking the chromosome tracks button in the top right (dark gray in the screenshot below) opens the chromosome view. Here, coverage information is shown for all chromosomes in the main sample. If additional sample tracks are available, these are shown as well.

Tracks can be expanded by right-clicking on them. For dot-tracks this simply expands the screen size. For band tracks, it expands such that there are no overlaps among the bands.

![Before expansion](img/before_expansion.PNG)

![After expansion](img/after_expansion.PNG)

![Chromosome view](img/chromosome_view.PNG)

Clicking any bands in the band tracks opens additional information. Here, a band in the annotation track is clicked.

![Annotations](img/annotations.PNG)

Clicking the info button in the top right corner opens available meta information for the sample. This is basic information on sample IDs, sample type and sex. If additional meta data has been loaded, this is also shown.

![Sample info](img/sample_info_after.PNG)

Much of the configurations of Gens can be done through the settings page. More details are shown below (FIXME).

![Settings](img/settings.PNG)

#### The settings page

Multiple annotations can be selected.

![Multiple annotations](img/multiple_annotations.PNG)

The track backgrounds can be colored based on one of the annotation tracks.

![Color by](img/color_by.PNG)

### The track page

#### Tracks

Displayed tracks include log2 coverage ratio, B-allele frequency, genes, variants and optional sample tracks.

An overview row summarises the data and a chromosome track indicates the current position.

Coverage values outside the selected Y-range are drawn in red at the max/min Y-value to highlight extreme values.

#### Track actions

Tracks can be rearranged by dragging the Y-axis. 

![Dragging](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/dragging.gif)

Tracks can be expanded by right clicking. For dot-tracks, this simply increases the height of the track. For band tracks,
it expands to show all overlapping bands.

![Expanding](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/expanding.gif)

The collapsed / expanded heights of tracks can be configured in the settings menu.

![Change track height](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/changing_height.gif)

You can zoom using the buttons or the .... shortcuts.
You can pan using the buttons or the .... shortcuts.
You can at any point reset the zoom to the current chromosome using "R" or pressing the "..." icon.


![External gif](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/navigation.gif)

#### Annotation tracks

You can select annotation tracks to display in the settings menu.


<GIF>

You can select one annotation track to color the backgrounds of other tracks.

<GIF>

These settings persist when refreshing the page.

#### Highlighting areas

Highlights can be placed in several way.

1. Enter highlight mode (shortcut M or the pencil button)
2. Click and drag

![Add highlights](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/add_highlights.gif)

Highlights can be removed by hovering over and pressing the "X", or by the settings menu.

![Remove highlights](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/remove_highlights.gif)

You can quickly navigate to any highlight through the settings menu.

![Navigate highlights](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/navigate_highlights.gif)

You can hide tracks though the track menu or the settings page.

You can unhide tracks through the settings page.

![Hide and unhide tracks](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/hide_unhide.gif)

Selecting annotations

![Multiple annotation tracks](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/multiple_annotation_tracks.gif)

Color track by annotation

![Color track by annotation](https://raw.githubusercontent.com/SMD-Bioinformatics-Lund/Documentation-resources/refs/heads/master/gens/mimisbrunnr.gif)

#### Band actions

 * Click to open context menu
 * Set highlight

### The chromosome page

![Chromosome view](./img/chromosome_view.PNG)

### The meta data view

![Meta data view](./img/)

### Settings menu

 * Annotation sources
 * Color tracks by
 * View, add and remove samples
 * Highlights
 * Track settings
 * Setting persistance
 * Move, show, collapse tracks