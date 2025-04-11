import { AnnotationTrack } from "../../unused/track/_annotation";
import { removeChildren } from "../../util/utils";
import { ShadowBaseElement as ShadowBaseElement } from "../util/shadowbase";
import { BandTrack } from "./band_track";

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container"></div>
`;

// FIXME: Refactor such that the annotation tracks can be created
// by the track mananger, and subsequently updated from here
export class AnnotationTracks extends ShadowBaseElement {
  protected _root: ShadowRoot;
  public label: string = "Annotation tracks";

  trackHeight: number;
  // getRenderData: () => Promise<AnnotationTrackData>;
  // renderData: AnnotationTracksData | null;
  getPopupInfo: (band: RenderBand) => PopupContent;

  getAnnotationSources: () => string[];
  getTrack: (string) => Promise<BandTrack>;
  tracks: BandTrack[] = [];

  // parentContainer: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback() {
    super.connectedCallback();
    // this._root = this.attachShadow({ mode: "open" });
    // this._root.appendChild(template.content.cloneNode(true));

    // this.parentContainer = this._root.getElementById(
    //   "container",
    // ) as HTMLDivElement;
  }

  async initialize(
    getAnnotSources: () => string[],
    getTrack: (source: string) => Promise<BandTrack>,
  ) {
    this.getAnnotationSources = getAnnotSources;
    this.getTrack = getTrack;

    // const parentContainer = this._root.getElementById(
    //   "container",
    // ) as HTMLDivElement;

    // this.trackHeight = trackHeight;
    // this.getRenderData = getRenderData;
    // this.getPopupInfo = getPopupInfo;
  }

  // async updateTracks() {

  //   this.tracks = await this.generateAnnotationTracks();

  //   // const { xRange, annotations } = renderData;

  // //   for (const {source, bands} of annotations) {
  // //     // const annotTrack = new BandTrack();
  // //     // this.parentContainer.appendChild(annotTrack);
  // //     // await annotTrack.initialize(
  // //     //   source,
  // //     //   this.trackHeight,
  // //     //   async () => {
  // //     //     return {
  // //     //       bands,
  // //     //       xRange,
  // //     //     };
  // //     //   },
  // //     //   this.getPopupInfo
  // //     // );
  // //     await annotTrack.render(true);
  // //   }
  // // }
  // }

  async _sync_tracks() {
    const newSources = await this.getAnnotationSources();
    const currentSources = this.tracks.map((track) => track.label);

    const addedSources = newSources.filter(s => !currentSources.includes(s));
    const removedSources = currentSources.filter(s => !newSources.includes(s));

    // FIXME: Make smarter, currently recreates all on change
    if (addedSources.length != 0 || removedSources.length != 0) {
      const container = this.root.getElementById("container");
      removeChildren(container);
      this.tracks = [];

      for (const source of newSources) {
        const track = await this.getTrack(source);
        this.tracks.push(track);
        container.appendChild(track);
      }
    }

  }

  async render(updateData: boolean) {

    console.log("Render called");

    this._sync_tracks();

    this.tracks.forEach((track) => track.render(updateData))

    // for (const track of this.tracks) {
    //   track.render(updateData);
    // }
  }
  // if (updateData || this.renderData == null) {
  //   this.renderData = await this.getRenderData();
  // }

  // removeChildren(this.parentContainer);

  // const { xRange, annotations } = this.renderData;

  //   for (const {source, bands} of annotations) {
  //     const annotTrack = new BandTrack();
  //     this.parentContainer.appendChild(annotTrack);
  //     await annotTrack.initialize(
  //       source,
  //       this.trackHeight,
  //       async () => {
  //         return {
  //           bands,
  //           xRange,
  //         };
  //       },
  //       this.getPopupInfo
  //     );
  //     await annotTrack.render(true);
  //   }
  // }
}

customElements.define("annotation-tracks", AnnotationTracks);
