import { get } from "../fetch";
import { MultiAnnotsTrack } from "./multiannotstrack";

async function getAnnotationSources(): Promise<string[]> {
  const results = await get("get-annotation-sources", { genome_build: 38 });
  return results.sources;
}

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

  private _message: string = "Hello world!";
  private _ballColor: string = "red";
  private _annotSources: HTMLElement[] = [];

  async setMessage(message: string) {
    console.log("Assigning message", message);
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

  constructor() {
    super();

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

  private _onAnnotationChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedAnnotations = Array.from(select.selectedOptions).map(
      (option) => option.value
    );
    // console.log("Selected annotations: ", selectedAnnotations);
    selectedAnnotations.forEach((annot) => this._makeTrack(annot));
  }

  private _makeTrack(name: string) {
    const track = new MultiAnnotsTrack();
    track.setTitle(name);
    const trackContainer = this._root.getElementById("container") as HTMLElement;
    trackContainer.appendChild(track);
  }
}

customElements.define("multi-annots", MultiAnnots);
