### Tracks view

The view of a single sample.

The tracks are:

* hg002 baf: B Allele Frequency
* hg002 cov: Log2 coverage ratio
* hg002 Variants: Filtered SV variants from external software (here from Scout)
* Mimisbrunnr: Annotation track. Multiple annotation tracks can be selected through the settings page (FIXME: see more below)
* UPD & ROH: Custom sample track, here with UPDs and ROHs calculated for the sample outside Gens and loaded together with the sample.

![Single](img/single.PNG)

Red dots in the coverage plot are outside the specified Y-range. To not hide this data, they are included in red at the edge of the plot.

When opening a full case, the view is similar, but will display BAF and coverage tracks for all included samples. Variant tracks for non-proband (i.e. mother / father) are available but hidden by default. Then can be shown in the settings menu (FIXME: see below).

![Trio](img/trio.PNG)

Clicking the chromosome tracks button in the top right (dark gray in the screenshot below) opens the chromosome view. Here, coverage information is shown for all chromosomes in the main sample. If additional sample tracks are available, these are shown as well.

![Chromosome view](img/chromosome_view.PNG)

Tracks can be expanded by right-clicking on them. For dot-tracks this simply expands the screen size. For band tracks, it expands such that there are no overlaps among the bands.

![Before expansion](img/before_expansion.PNG)

![After expansion](img/after_expansion.PNG)

Clicking any bands in the band tracks opens additional information. Here, a band in the annotation track is clicked.

![Annotations](img/annotations.PNG)

Clicking the info button in the top right corner opens available meta information for the sample. This is basic information on sample IDs, sample type and sex. If additional meta data has been loaded, this is also shown.

![Sample info](img/sample_info_after.PNG)

Much of the configurations of Gens can be done through the settings page. More details are shown below (FIXME).

![Settings](img/settings.PNG)

#### Annotation tracks

You can select annotation tracks to display in the settings menu.


<GIF>

You can select one annotation track to color the backgrounds of other tracks.

<GIF>

These settings persist when refreshing the page.