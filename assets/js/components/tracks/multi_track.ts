import { removeChildren } from "../../util/utils";
import { ShadowBaseElement as ShadowBaseElement } from "../util/shadowbase";
import { BandTrack } from "./band_track";

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container"></div>
`;

export class MultiTracks extends ShadowBaseElement {
  protected _root: ShadowRoot;
  public label: string = "Annotation tracks";

  trackHeight: number;
  getPopupInfo: (band: RenderBand) => PopupContent;

  getSources: () => { label: string; id: string }[];
  getTrack: (id: string, label: string) => BandTrack;
  tracks: BandTrack[] = [];

  constructor(
    getSources: () => { label: string; id: string }[],
    getTrack: (id: string, label: string) => BandTrack,
  ) {
    super(template);

    this.getSources = getSources;
    this.getTrack = getTrack;
  }

  connectedCallback(): void {
    const selectedSources = this.getSources();
    const initialize = false;
    this.updateTracks(selectedSources, initialize);
  }

  initialize() {
    const selectedSources = this.getSources();
    const initialize = true;
    this.updateTracks(selectedSources, initialize);
  }

  syncDimensions() {
    for (const track of this.tracks) {
      track.syncDimensions();
    }
  }

  renderLoading() {
    for (const track of this.tracks) {
      track.renderLoading();
    }
  }

  async updateTracks(
    selectedSources: { label: string; id: string }[],
    initialize: boolean,
  ) {
    const container = this.root.getElementById("container");
    removeChildren(container);

    const tracks = [];
    for (const source of selectedSources) {
      const track = this.getTrack(source.id, source.label);
      container.appendChild(track);
      if (initialize) {
        track.initialize();
      }
      tracks.push(track);
    }
    this.tracks = tracks;
  }

  async render(updateData: boolean) {
    const selectedSources = this.getSources();
    const trackSources = this.tracks.map((track) => track.id);
    const tracksDiffer = checkTracksDiffer(
      selectedSources.map((s) => s.id),
      trackSources,
    );

    if (tracksDiffer) {
      const initialize = true;
      await this.updateTracks(selectedSources, initialize);
    }
    this.tracks.forEach((track) => track.render(updateData || tracksDiffer));
  }
}

function checkTracksDiffer(
  selectedSourceIds: string[],
  trackSourceIds: string[],
) {
  const addedSources = selectedSourceIds.filter(
    (s) => !trackSourceIds.includes(s),
  );
  const removedSources = trackSourceIds.filter(
    (s) => !selectedSourceIds.includes(s),
  );
  return addedSources.length != 0 || removedSources.length != 0;
}

customElements.define("annotation-tracks", MultiTracks);
