# User guide

How to run Gens and interpret the output.

## The samples page

The start page lists all samples found in the database. From here you can open a single sample or an entire case.
A search field helps locating specific entries. Each row includes a link to open the sample in an external software when such
integration is configured.

![Samples page](img/samples.PNG)

## The sample viewer

![Single](img/single.PNG)

![Trio](img/trio.PNG)

![Chromosome view](img/chromosome_view.PNG)

![Annotations](img/annotations.PNG)

![Highlights](img/highlighs.PNG)

![Sample info](img/sample_info_after.PNG)

![Settings](img/settings.PNG)

![Color by](img/color_by.PNG)

![Multiple annotations](img/multiple_annotations.PNG)

![Before expansion](img/before_expansion.PNG)

![After expansion](img/after_expansion.PNG)

![Red dots](img/red_dots.PNG)

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

### The meta data view

### Settings menu

 * Annotation sources
 * Color tracks by
 * View, add and remove samples
 * Highlights
 * Track settings
 * Setting persistance
 * Move, show, collapse tracks