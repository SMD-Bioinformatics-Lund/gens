import { SIZES } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";

import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { TrackView } from "./track_view";
import { ChromosomeView } from "./chromosome_view";


const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      /* Size includes also borders and paddings */
      box-sizing: border-box;
      padding: 0px ${SIZES.m}px;
    }
  </style>
  <chromosome-view id="chromosome-view"></chromosome-view>
  <track-view id="track-view"></track-view>
`;

export class TracksManager extends ShadowBaseElement {
  public trackView: TrackView;
  public chromosomeView: ChromosomeView;

  private session: GensSession;
  private onChange: (settings: RenderSettings) => void;

  getAnnotationDetails: (id: string) => Promise<ApiAnnotationDetails>;
  openTrackContextMenu: (track: DataTrack) => void;

  constructor() {
    super(template);
  }

  connectedCallback() {
    window.addEventListener("resize", () => {
      // If null, then tracks_manager is not yet initialized
      if (this.onChange == null) {
        return;
      }
      this.onChange({ resized: true });
    });

    this.trackView = this.root.querySelector("#track-view");
    this.chromosomeView = this.root.querySelector("#chromosome-view");
  }

  async initializeTrackView(
    render: (settings: RenderSettings) => void,
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSource: RenderDataSource,
    session: GensSession,
  ) {
    this.session = session;
    this.onChange = render;

    this.trackView.hidden = false;
    this.chromosomeView.hidden = true;

    await this.trackView.initialize(
      render,
      chromSizes,
      chromClick,
      dataSource,
      session,
    );

    await this.chromosomeView.initialize(session, dataSource);
  }

  setCovYRange(covHeights: Rng) {
    this.session.setCoverageRange(covHeights);
    this.chromosomeView.setCovYRange(covHeights);
    this.trackView.setCovYRange(covHeights);
  }

  render(settings: RenderSettings) {
    const chromViewActive = this.session.getChromViewActive();
    this.chromosomeView.hidden = !chromViewActive;
    this.trackView.hidden = chromViewActive;

    if (!chromViewActive) {
      this.trackView.render(settings);
    } else {
      this.chromosomeView.render(settings);
    }
  }
}

customElements.define("gens-tracks", TracksManager);
