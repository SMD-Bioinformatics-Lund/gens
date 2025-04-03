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

const THICK_TRACK_HEIGHT = 80;
const THIN_TRACK_HEIGHT = 20;
const COV_Y_RANGE: [number, number] = [-4, 4];
const BAF_Y_RANGE: [number, number] = [0, 1];

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container">
        <ideogram-track id="ideogram-track"></ideogram-track>
    
        <dot-track id="coverage-track"></dot-track>
        <dot-track id="baf-track"></dot-track>
        <div id="annotations-container"></div>
        <band-track id="transcript-track"></band-track>
        <band-track id="variant-track" hidden></band-track>

        <overview-track id="overview-track-cov"></overview-track>
        <overview-track id="overview-track-baf"></overview-track>
    </div>
`;

export class GensTracks extends HTMLElement {
  protected _root: ShadowRoot;

  ideogramTrack: IdeogramTrack;
  overviewTrackCov: OverviewTrack;
  overviewTrackBaf: OverviewTrack;
  coverageTrack: DotTrack;
  bafTrack: DotTrack;
  transcriptTrack: BandTrack;
  variantTrack: BandTrack;

  annotationsContainer: HTMLDivElement;

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

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
    overviewCovData: OverviewData,
    overviewBafData: OverviewData,
    chromClick: (string) => void,
  ) {
    this.coverageTrack.initialize("Coverage", THICK_TRACK_HEIGHT);
    this.bafTrack.initialize("BAF", THICK_TRACK_HEIGHT);
    this.variantTrack.initialize("Variant", THIN_TRACK_HEIGHT);
    this.transcriptTrack.initialize("Transcript", THIN_TRACK_HEIGHT);
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

    // this.overviewTrackCov.render(null, overviewCovData, COV_Y_RANGE);
    // this.overviewTrackBaf.render(null, overviewBafData, BAF_Y_RANGE);
  }

  render(data: RenderData, region: Region) {
    const range: [number, number] = [region.start, region.end];

    this.overviewTrackCov.render(
      region.chrom,
      data.overviewCovData,
      COV_Y_RANGE,
    );
    this.overviewTrackBaf.render(
      region.chrom,
      data.overviewBafData,
      BAF_Y_RANGE,
    );

    // const chromInfo = await gensDb.getChromData(region.chrom);
    this.ideogramTrack.render(region.chrom, data.chromInfo, range);

    // FIXME: Move this somewhere?
    removeChildren(this.annotationsContainer);
    Object.entries(data.annotations).forEach(([source, annotData]) => {
      const annotTrack = new BandTrack();
      this.annotationsContainer.appendChild(annotTrack);
      annotTrack.initialize(source, THIN_TRACK_HEIGHT);
      annotTrack.render(range, annotData);
    });

    this.coverageTrack.render(range, COV_Y_RANGE, data.covData);

    // const bafData = await gensDb.getBaf(region.chrom);
    this.bafTrack.render(range, BAF_Y_RANGE, data.bafData);

    this.transcriptTrack.render(range, data.transcriptData);
  }
}

customElements.define("gens-tracks", GensTracks);
