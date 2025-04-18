import { AnnotationTrack } from "../../unused/track/_annotation";
import { removeChildren } from "../../util/utils";
import { ShadowBaseElement as ShadowBaseElement } from "../util/shadowbase";
import { BandTrack } from "./band_track";

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container"></div>
`;

export class AnnotationTracks extends ShadowBaseElement {
  protected _root: ShadowRoot;
  public label: string = "Annotation tracks";

  trackHeight: number;
  getPopupInfo: (band: RenderBand) => PopupContent;

  getAnnotationSources: () => string[];
  getTrack: (string) => BandTrack;
  tracks: BandTrack[] = [];

  constructor(
    getAnnotSources: () => string[],
    getTrack: (source: string) => BandTrack,
  ) {
    super(template);

    this.getAnnotationSources = getAnnotSources;
    this.getTrack = getTrack;
  }

  connectedCallback(): void {
    const selectedSources = this.getAnnotationSources();
    const initialize = false;
    this.updateTracks(selectedSources, initialize);    
  }

  initialize() {
    const selectedSources = this.getAnnotationSources();
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

  async updateTracks(selectedSources: string[], initialize: boolean) {
    const container = this.root.getElementById("container");
    removeChildren(container);

    const tracks = [];
    for (const source of selectedSources) {
      const track = this.getTrack(source);
      container.appendChild(track);
      if (initialize) {
        track.initialize();
      }
      tracks.push(track);
    }
    this.tracks = tracks;
  }

  async render(updateData: boolean) {

    const selectedSources = this.getAnnotationSources();
    const trackSources = this.tracks.map((track) => track.label);
    const tracksDiffer = checkTracksDiffer(selectedSources, trackSources);

    if (tracksDiffer) {
      const initialize = true;
      await this.updateTracks(selectedSources, initialize);
    }
    this.tracks.forEach((track) => track.render(updateData || tracksDiffer));
  }
}

function checkTracksDiffer(selectedSources: string[], trackSources: string[]) {
  const addedSources = selectedSources.filter((s) => !trackSources.includes(s));
  const removedSources = trackSources.filter(
    (s) => !selectedSources.includes(s),
  );
  return addedSources.length != 0 || removedSources.length != 0;
}

customElements.define("annotation-tracks", AnnotationTracks);
