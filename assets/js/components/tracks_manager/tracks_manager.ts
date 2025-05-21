import { SIZES, STYLE } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";

import { GensSession } from "../../state/gens_session";
import { DataTrack } from "../tracks/base_tracks/data_track";
import { TrackView } from "./track_view";
import { ChromosomeView } from "./chromosome_view";

export const COV_Y_RANGE: [number, number] = [-3, 3];
export const BAF_Y_RANGE: [number, number] = [0, 1];

// FIXME: This will need to be generalized such that tracks aren't hard-coded
const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      width: 100%;
      padding-left: ${SIZES.m}px;
      padding-right: ${SIZES.m}px;
      padding-bottom: ${SIZES.m}px;
    }
    .track-handle {
      cursor: grab;
    }
    .track-handle:active,
    .track.dragging .track-handle {
      cursor: grabbing;
    }
    #tracks-container {
      position: relative;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    #tracks-container.grabbable {
      cursor: grab;
    }
    #tracks-container.grabbing {
      cursor: grabbing;
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
      this.onChange({ resized: true });
    });

    this.trackView = this.root.querySelector("#track-view");
    this.chromosomeView = this.root.querySelector("#chromosome-view");
  }

  async initialize(
    render: (settings: RenderSettings) => void,
    sampleIds: string[],
    chromSizes: Record<string, number>,
    chromClick: (chrom: string) => void,
    dataSource: RenderDataSource,
    session: GensSession,
  ) {
    this.session = session;
    this.onChange = render;

    this.trackView.initialize(
      render,
      sampleIds,
      chromSizes,
      chromClick,
      dataSource,
      session,
    );

    this.chromosomeView.initialize(
      session,
      sampleIds,
      dataSource,
      (_track: DataTrack) => {
        console.log(
          "FIXME: Context menu also for chromosome view (should use the same base logic)",
        );
      },
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
