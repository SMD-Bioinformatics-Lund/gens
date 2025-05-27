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
  <flex-row id="main-row">
    <div id="label"></div>
    <flex-row>
      <icon-button id="remove" icon="${ICONS.trash}"></icon-button>
    </flex-row>
  </flex-row>
`;

export class SampleRow extends ShadowBaseElement {
  private labelElem: HTMLDivElement;
  private removeElem: IconButton;

  private sample: Sample;
  private onRemoveSample: (sample: Sample) => void;

  constructor() {
    super(template);
  }

  initialize(sample: Sample, onRemoveSample: (sample: Sample) => void) {
    this.sample = sample;
    this.onRemoveSample = onRemoveSample;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.labelElem = this.root.querySelector("#label");
    this.removeElem = this.root.querySelector("#remove");

    this.labelElem.innerHTML = `${this.sample.sampleId} (case: ${this.sample.caseId})`;
    this.removeElem.addEventListener(
      "click",
      (_e) => {
        this.onRemoveSample(this.sample);
      },
      { signal: this.getListenerAbortSignal() },
    );
  }
}

customElements.define("sample-row", SampleRow);
