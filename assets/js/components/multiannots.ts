import { get } from "../fetch";
import { MultiAnnotsTrack } from "./multiannotstrack";

async function getAnnotationSources(): Promise<string[]> {
  const results = await get("get-annotation-sources", { genome_build: 38 });
  return results.sources;
}

async function getAnnotationData(source: string): Promise<string[]> {
  const payload = {
    "sample_id": undefined,
    "region": "1:1-None",
    "genome_build": 38,
    "collapsed": false,
    source
  }
  const results = await get("get-annotation-data", payload);
  console.log(results);
  return [];
}

// "get-annotation-data"
// http://localhost:5000/api/get-annotation-data?sample_id=undefined&region=1:1-None&genome_build=38&collapsed=false&source=Imprinted.genes.Lund-hg38



const template = document.createElement("template");
template.innerHTML = `
    <div>
        <p id="message">Placeholder</p>
        <div id="container"></div>
        <select id="annotations" multiple></select>
    </div>
`;

export class MultiAnnots extends HTMLElement {
  private _root: ShadowRoot;

  private _annotSources: HTMLElement[] = [];

  private async _updateAnnotationSources() {
    this._annotSources.map((source) => source.remove());
    // this._textElement.textContent = message;

    const annotSelect = this._root.querySelector(
      "#annotations"
    ) as HTMLSelectElement | null;
    if (annotSelect) {
      annotSelect.innerHTML = "";
    }
    const annotSources = await getAnnotationSources();
    annotSources.forEach((source) => {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = source;
      annotSelect?.appendChild(option);

      // const element = document.createElement("p");
      // element.textContent = source;
      // this._root.appendChild(element);
    });
  }

  public initialize() {
    this._updateAnnotationSources();
  }

  connectedCallback() {
    console.log("Is connected");

    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    const helloElement = this._root.getElementById("message");
    helloElement.textContent = "Hello World!";
    // const wrapper = document.createElement("p");
    // shadow.appendChild(wrapper);
    // this._textElement = wrapper;

    const annotSelect = this._root.getElementById(
      "annotations"
    ) as HTMLSelectElement;
    annotSelect.addEventListener("change", this._onAnnotationChange.bind(this));
  }

  constructor() {
    super();
  }

  private _onAnnotationChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedAnnotations = Array.from(select.selectedOptions).map(
      (option) => option.value
    );
    // console.log("Selected annotations: ", selectedAnnotations);
    const trackContainer = this._root.getElementById("container") as HTMLElement;
    while(trackContainer.firstChild) {
      trackContainer.removeChild(trackContainer.firstChild);
    }
    selectedAnnotations.forEach((annot) => this._makeTrack(trackContainer, annot));
  }

  private _makeTrack(container: HTMLElement, source: string) {

    console.log("Attempting to run getAnnotationData for source", source);
    // const annotData = getAnnotationData(source)

    const track = new MultiAnnotsTrack();
    track.setTitle(source);
    container.appendChild(track);
  }
}

customElements.define("multi-annots", MultiAnnots);
