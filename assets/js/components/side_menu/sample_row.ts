import { ICONS } from "../../constants";
import { IconButton } from "../util/icon_button";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #main-row {
      justify-content: space-between;
      width: 100%;
    }
  </style>
  <g-row id="main-row">
    <div id="label"></div>
    <g-row>
      <icon-button id="remove" icon="${ICONS.trash}"></icon-button>
    </g-row>
  </g-row>
`;

export class SampleRow extends ShadowBaseElement {
  private labelElem: HTMLDivElement;
  private removeElem: IconButton;

  private sampleId: string;
  private onRemoveSample: (sampleId: string) => void;

  constructor() {
    super(template);
  }

  initialize(sampleId: string, onRemoveSample: (sampleId: string) => void) {
    this.sampleId = sampleId;
    this.onRemoveSample = onRemoveSample;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.labelElem = this.root.querySelector("#label");
    this.removeElem = this.root.querySelector("#remove");

    this.labelElem.innerHTML = this.sampleId;
    this.removeElem.addEventListener(
      "click",
      (_e) => {
        this.onRemoveSample(this.sampleId);
      },
      { signal: this.getListenerAbortSignal() },
    );
  }
}

customElements.define("sample-row", SampleRow);
