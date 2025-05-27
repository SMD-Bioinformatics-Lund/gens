import { SIZES, STYLE } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";

import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { TrackView } from "./track_view";
import { ChromosomeView } from "./chromosome_view";

export const COV_Y_RANGE: [number, number] = [-3, 3];
export const BAF_Y_RANGE: [number, number] = [0, 1];

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

  async initialize(
    render: (settings: RenderSettings) => void,
    samples: Sample[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSource: RenderDataSource,
    session: GensSession,
  ) {
    this.session = session;
    this.onChange = render;

    this.trackView.initialize(
      render,
      samples,
      chromSizes,
      chromClick,
      dataSource,
      session,
    );

    this.chromosomeView.initialize(
      session,
      dataSource,
    );
  }

  render(settings: RenderSettings) {
    // Could session be provided in all render methods? Should it?
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
