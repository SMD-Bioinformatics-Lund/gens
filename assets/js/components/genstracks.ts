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

const THICK_TRACK_HEIGHT = 80;
const THIN_TRACK_HEIGHT = 20;
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
    }
  </style>
  <div id="container">
      <ideogram-track id="ideogram-track"></ideogram-track>
  
      <dot-track id="coverage-track"></dot-track>
      <dot-track id="baf-track"></dot-track>
      <div id="annotations-container"></div>
      <band-track id="transcript-track"></band-track>
      <band-track id="variant-track"></band-track>

      <overview-track id="overview-track-cov"></overview-track>
      <overview-track id="overview-track-baf"></overview-track>
  </div>
`;

const DEBOUNCE_MS = 500;

export class GensTracks extends HTMLElement {
  protected _root: ShadowRoot;

  private resizeObserver: ResizeObserver;
  private resizeDebounceTimer: number | null = null;
  parentContainer: HTMLDivElement;

  ideogramTrack: IdeogramTrack;
  overviewTrackCov: OverviewTrack;
  overviewTrackBaf: OverviewTrack;
  coverageTrack: DotTrack;
  bafTrack: DotTrack;
  transcriptTrack: BandTrack;
  variantTrack: BandTrack;

  isInitialized = false;

  annotationsContainer: HTMLDivElement;

  annotTracks: BandTrack[];

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    const container = this._root.getElementById("container") as HTMLDivElement;
    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.resizeDebounceTimer !== null) {
        clearTimeout(this.resizeDebounceTimer);
      }

      this.resizeDebounceTimer = window.setTimeout(() => {
        this.resizeDebounceTimer = null;

        const entry = entries[0];
        const { width, height } = entry.contentRect;
        console.log("Debounced resize:", width, height);
        if (this.isInitialized) {
          this.render();
        }
      }, DEBOUNCE_MS);
    });

    this.resizeObserver.observe(container);

    this.ideogramTrack = this._root.getElementById(
      "ideogram-track",
    ) as IdeogramTrack;
    this.overviewTrackCov = this._root.getElementById(
      "overview-track-cov",
    ) as OverviewTrack;
    this.overviewTrackBaf = this._root.getElementById(
      "overview-track-baf",
    ) as OverviewTrack;

    this.coverageTrack = this._root.getElementById(
      "coverage-track",
    ) as DotTrack;
    this.bafTrack = this._root.getElementById("baf-track") as DotTrack;
    this.transcriptTrack = this._root.getElementById(
      "transcript-track",
    ) as BandTrack;
    this.variantTrack = this._root.getElementById("variant-track") as BandTrack;

    this.annotationsContainer = this._root.getElementById(
      "annotations-container",
    ) as HTMLDivElement;
  }

  initialize(
    allChromData: Record<string, ChromosomeInfo>,
    chromClick: (string) => void,
  ) {
    this.coverageTrack.initialize("Coverage", THICK_TRACK_HEIGHT);
    this.bafTrack.initialize("BAF", THICK_TRACK_HEIGHT);
    this.variantTrack.initialize(
      "Variant",
      THIN_TRACK_HEIGHT,
      THICK_TRACK_HEIGHT,
    );
    this.transcriptTrack.initialize(
      "Transcript",
      THIN_TRACK_HEIGHT,
      THICK_TRACK_HEIGHT,
    );
    this.ideogramTrack.initialize("Ideogram", THIN_TRACK_HEIGHT);

    const chromSizes = transformMap(allChromData, (data) => data.size);

    this.overviewTrackCov.initialize(
      "Overview (cov)",
      THICK_TRACK_HEIGHT,
      chromSizes,
      chromClick,
    );
    this.overviewTrackBaf.initialize(
      "Overview (baf)",
      THICK_TRACK_HEIGHT,
      chromSizes,
      chromClick,
    );
  }

  updateRenderData(data: RenderData, region: Region) {
    const xRange: [number, number] = [region.start, region.end];

    // FIXME: Move to constants
    const bandHeight = STYLE.render.bandHeight;
    this.variantTrack.updateRenderData({
      xRange,
      bands: data.variantData,
      settings: { bandHeight },
    });

    this.overviewTrackCov.updateRenderData({
      region,
      dotsPerChrom: data.overviewCovData,
      yRange: COV_Y_RANGE,
    });
    this.overviewTrackBaf.updateRenderData({
      region,
      dotsPerChrom: data.overviewBafData,
      yRange: BAF_Y_RANGE,
    });

    this.ideogramTrack.updateRenderData({ chromInfo: data.chromInfo, xRange });

    removeChildren(this.annotationsContainer);
    this.annotTracks = [];
    Object.entries(data.annotations).forEach(([source, annotData]) => {
      const annotTrack = new BandTrack();
      this.annotationsContainer.appendChild(annotTrack);
      annotTrack.initialize(source, THIN_TRACK_HEIGHT, THICK_TRACK_HEIGHT);
      annotTrack.updateRenderData({
        xRange,
        bands: annotData,
        settings: { bandHeight },
      });
      this.annotTracks.push(annotTrack);
    });

    this.coverageTrack.updateRenderData({
      xRange,
      yRange: COV_Y_RANGE,
      dots: data.covData,
    });
    this.bafTrack.updateRenderData({
      xRange,
      yRange: BAF_Y_RANGE,
      dots: data.bafData,
    });
    this.transcriptTrack.updateRenderData({
      xRange,
      bands: data.transcriptData,
      settings: { bandHeight },
    });

    this.isInitialized = true;
  }

  public render() {
    this.transcriptTrack.render();
    this.coverageTrack.render();
    this.bafTrack.render();
    this.variantTrack.render();
    this.overviewTrackCov.render();
    this.overviewTrackBaf.render();
    this.ideogramTrack.render();

    for (const track of this.annotTracks) {
      track.render();
    }
  }
}

customElements.define("gens-tracks", GensTracks);
