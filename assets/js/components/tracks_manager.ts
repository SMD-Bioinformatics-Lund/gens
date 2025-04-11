import "./tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import "./tracks/annotation_tracks";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { AnnotationTracks } from "./tracks/annotation_tracks";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { CHROMOSOMES, STYLE } from "../constants";
import { CanvasTrack } from "./tracks/canvas_track";

const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

const COV_Y_TICKS = [-3, -2, -1, 0, 1, 2, 3];
const BAF_Y_TICKS = [0.2, 0.4, 0.6, 0.8];

// FIXME: This will need to be generalized such that tracks aren't hard-coded
const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      width: 100%;
    }
    #container {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      /* overflow-x: hidden; */
      padding-left: 10px;
      padding-right: 10px;
    }
  </style>
  <div id="container"></div>
`;

export class TracksManager extends HTMLElement {
  protected _root: ShadowRoot;

  parentContainer: HTMLDivElement;
  isInitialized = false;
  annotationsContainer: HTMLDivElement;

  // FIXME: Think about a shared interface
  tracks: (CanvasTrack | AnnotationTracks)[] = [];

  // This one needs a dedicated component I think
  annotationTracks: BandTrack[] = [];

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    window.addEventListener("resize", () => {
      this.render(false);
    });

    this.parentContainer = this._root.getElementById(
      "container",
    ) as HTMLDivElement;
  }

  async initialize(
    getChromInfo: (string) => ChromosomeInfo,
    chromClick: (string) => void,
    dataSource: RenderDataSource,
    getChromosome: () => string,
    getXRange: () => Rng,
    getAnnotSources: () => string[],
    navigateToVariant: (id: string) => void,
  ) {
    const trackHeight = STYLE.bandTrack.trackHeight;

    const coverageTrack = new DotTrack();
    const bafTrack = new DotTrack();
    const variantTrack = new BandTrack();
    const transcriptTrack = new BandTrack();
    const ideogramTrack = new IdeogramTrack();

    const annotationTracks = new AnnotationTracks();

    const overviewTrackCov = new OverviewTrack();
    const overviewTrackBaf = new OverviewTrack();

    this.tracks.push(
      ideogramTrack,
      coverageTrack,
      bafTrack,
      annotationTracks,
      variantTrack,
      transcriptTrack,
      overviewTrackCov,
      overviewTrackBaf,
    );

    for (const track of this.tracks) {
      this.parentContainer.appendChild(track);
    }

    await coverageTrack.initialize(
      "Log2 Ratio",
      trackHeight.thick,
      COV_Y_RANGE,
      COV_Y_TICKS,
      async () => {
        return {
          xRange: getXRange(),
          dots: await dataSource.getCovData(),
        };
      },
    );

    await bafTrack.initialize(
      "B Allele Freq",
      trackHeight.thick,
      BAF_Y_RANGE,
      BAF_Y_TICKS,
      async () => {
        return {
          xRange: getXRange(),
          dots: await dataSource.getBafData(),
        };
      },
    );

    await annotationTracks.initialize(trackHeight.thin, async () => {
      const annotSources = getAnnotSources();
      const annotationsData: { source: string; bands: RenderBand[] }[] = [];
      for (const annotSource of annotSources) {
        const bands = await dataSource.getAnnotation(annotSource);
        const annotData = {
          source: annotSource,
          bands,
        };
        annotationsData.push(annotData);
      }
      return {
        xRange: getXRange(),
        annotations: annotationsData,
      };
    });

    await variantTrack.initialize(
      "Variant",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getVariantData(),
        };
      },
      (band) => {
        console.log("Hitting band", band);
        navigateToVariant(band.id);
      },
    );

    await transcriptTrack.initialize(
      "Transcript",
      trackHeight.thin,
      async () => {
        return {
          xRange: getXRange(),
          bands: await dataSource.getTranscriptData(),
        };
      },
    );

    await ideogramTrack.initialize(
      "Ideogram",
      trackHeight.extraThin,
      async () => {
        return {
          xRange: getXRange(),
          chromInfo: await dataSource.getChromInfo(),
        };
      },
    );

    const chromSizes = {};
    for (const chromosome of CHROMOSOMES) {
      chromSizes[chromosome] = getChromInfo(chromosome).size;
    }

    await overviewTrackCov.initialize(
      "Overview (cov)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      COV_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await dataSource.getOverviewCovData(),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
    );

    await overviewTrackBaf.initialize(
      "Overview (baf)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      BAF_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await dataSource.getOverviewBafData(),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
    );
  }

  public render(updateData: boolean) {
    for (const track of this.tracks) {
      track.render(updateData);
    }
  }
}

customElements.define("gens-tracks", TracksManager);
