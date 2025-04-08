import "./tracks/canvas_track";
import "./tracks/band_track";
import "./tracks/dot_track";
import "./tracks/ideogram_track";
import "./tracks/overview_track";
import { IdeogramTrack } from "./tracks/ideogram_track";
import { OverviewTrack } from "./tracks/overview_track";
import { DotTrack } from "./tracks/dot_track";
import { BandTrack } from "./tracks/band_track";
import { transformMap, removeChildren } from "../track/utils";
import { STYLE } from "../util/constants";
import { CanvasTrack } from "./tracks/canvas_track";

const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

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
      overflow-x: hidden;
      padding-left: 10px;
      padding-right: 10px;
    }
  </style>
  <div id="container">
      <!-- <ideogram-track id="ideogram-track"></ideogram-track>
  
      <dot-track id="coverage-track"></dot-track>
      <dot-track id="baf-track"></dot-track>
      <div id="annotations-container"></div>
      <band-track id="transcript-track"></band-track>
      <band-track id="variant-track"></band-track>

      <overview-track id="overview-track-cov"></overview-track>
      <overview-track id="overview-track-baf"></overview-track> -->
  </div>
`;

export class TracksManager extends HTMLElement {
  protected _root: ShadowRoot;

  parentContainer: HTMLDivElement;

  // ideogramTrack: IdeogramTrack;
  // overviewTrackCov: OverviewTrack;
  // overviewTrackBaf: OverviewTrack;
  // coverageTrack: DotTrack;
  // bafTrack: DotTrack;
  // transcriptTrack: BandTrack;
  // variantTrack: BandTrack;

  isInitialized = false;

  annotationsContainer: HTMLDivElement;

  tracks: CanvasTrack[];

  annotTracks: BandTrack[];

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    window.addEventListener("resize", () => {
      if (this.isInitialized) {
        this.render();
      }
    });

    this.parentContainer = this._root.getElementById(
      "container",
    ) as HTMLDivElement;

    // this.ideogramTrack = this._root.getElementById(
    //   "ideogram-track",
    // ) as IdeogramTrack;
    // this.overviewTrackCov = this._root.getElementById(
    //   "overview-track-cov",
    // ) as OverviewTrack;
    // this.overviewTrackBaf = this._root.getElementById(
    //   "overview-track-baf",
    // ) as OverviewTrack;

    // this.coverageTrack = this._root.getElementById(
    //   "coverage-track",
    // ) as DotTrack;
    // this.bafTrack = this._root.getElementById("baf-track") as DotTrack;
    // this.transcriptTrack = this._root.getElementById(
    //   "transcript-track",
    // ) as BandTrack;
    // this.variantTrack = this._root.getElementById("variant-track") as BandTrack;

    // this.annotationsContainer = this._root.getElementById(
    //   "annotations-container",
    // ) as HTMLDivElement;
  }

  initialize(
    allChromData: Record<string, ChromosomeInfo>,
    chromClick: (string) => void,
    renderDataSource: RenderDataSource,
    getChromosome: () => string,
    getXRange: () => Rng,
  ) {
    const trackHeight = STYLE.bandTrack.trackHeight;

    const coverageTrack = new DotTrack();
    this.parentContainer.appendChild(coverageTrack);
    coverageTrack.initialize(
      "Coverage",
      trackHeight.thick,
      COV_Y_RANGE,
      async () => {
        return {
          xRange: getXRange(),
          dots: await renderDataSource.getCovData(),
        };
      },
    );

    const bafTrack = new DotTrack();
    this.parentContainer.appendChild(bafTrack);
    bafTrack.initialize("BAF", trackHeight.thick, BAF_Y_RANGE, async () => {
      return {
        xRange: getXRange(),
        dots: await renderDataSource.getBafData(),
      };
    });

    const variantTrack = new BandTrack();
    this.parentContainer.appendChild(variantTrack);
    variantTrack.initialize("Variant", trackHeight.thin, async () => {
      return {
        xRange: getXRange(),
        bands: await renderDataSource.getVariantData(),
      };
    });

    const transcriptTrack = new BandTrack();
    this.parentContainer.appendChild(transcriptTrack);
    transcriptTrack.initialize("Transcript", trackHeight.thin, async () => {
      return {
        xRange: getXRange(),
        bands: await renderDataSource.getTranscriptData(),
      };
    });

    const ideogramTrack = new IdeogramTrack();
    this.parentContainer.appendChild(ideogramTrack);
    ideogramTrack.initialize("Ideogram", trackHeight.thin, async () => {
      return {
        xRange: getXRange(),
        chromInfo: await renderDataSource.getChromInfo(),
      };
    });

    const chromSizes = transformMap(allChromData, (data) => data.size);

    const overviewTrackCov = new OverviewTrack();
    this.parentContainer.appendChild(overviewTrackCov);
    overviewTrackCov.initialize(
      "Overview (cov)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      COV_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await renderDataSource.getOverviewCovData(),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
    );

    const overviewTrackBaf = new OverviewTrack();
    this.parentContainer.appendChild(overviewTrackBaf);
    overviewTrackBaf.initialize(
      "Overview (baf)",
      trackHeight.thick,
      chromSizes,
      chromClick,
      BAF_Y_RANGE,
      async () => {
        return {
          dotsPerChrom: await renderDataSource.getOverviewBafData(),
          xRange: getXRange(),
          chromosome: getChromosome(),
        };
      },
    );

    this.tracks.push(
      coverageTrack,
      bafTrack,
      variantTrack,
      transcriptTrack,
      ideogramTrack,
      overviewTrackCov,
      overviewTrackBaf,
    );
  }

  updateRenderData() {
    for (const track of this.tracks) {
      track.updateRenderData();
    }
    this.isInitialized = true;
  }

  public render() {
    for (const track of this.tracks) {
      track.render();
    }
  }
}

customElements.define("gens-tracks", TracksManager);
