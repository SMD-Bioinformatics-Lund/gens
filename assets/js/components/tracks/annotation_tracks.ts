import { removeChildren } from "../../util/utils";
import { BandTrack } from "./band_track";

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container"></div>
`;

export class AnnotationTracks extends HTMLElement {
  protected _root: ShadowRoot;
  public label: string = "Annotation tracks";

  trackHeight: number;
  getRenderData: () => Promise<AnnotationTracksData>;
  renderData: AnnotationTracksData | null;

  parentContainer: HTMLDivElement;

  constructor() {
    super();
  }

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    this.parentContainer = this._root.getElementById(
      "container",
    ) as HTMLDivElement;
  }

  async initialize(
    trackHeight: number,
    getRenderData: () => Promise<AnnotationTracksData>,
  ) {
    this.trackHeight = trackHeight;
    this.getRenderData = getRenderData;
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    removeChildren(this.parentContainer);

    const { xRange, annotations } = this.renderData;

    for (const {source, bands} of annotations) {
      const annotTrack = new BandTrack();
      this.parentContainer.appendChild(annotTrack);
      await annotTrack.initialize(
        source,
        this.trackHeight,
        async () => {
          return {
            bands,
            xRange,
          };
        },
      );
      await annotTrack.render(true);
    }
  }
}

customElements.define("annotation-tracks", AnnotationTracks);
