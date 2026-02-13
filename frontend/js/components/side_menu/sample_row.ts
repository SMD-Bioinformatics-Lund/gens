import { COLORS, FONT_SIZE, FONT_WEIGHT, ICONS, SIZES } from "../../constants";
import { formatCaseLabel } from "../../util/utils";
import { IconButton } from "../util/icon_button";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #main-row {
      justify-content: space-between;
      width: 100%;
      align-items: center;
    }
    #labels {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: ${SIZES.xxs}px;
    }
    #sample-label {
      font-weight: ${FONT_WEIGHT.header};
      word-break: break-word;
    }
    #case-label {
      color: ${COLORS.darkGray};
      font-size: ${FONT_SIZE.medium}px;
      word-break: break-word;
    }
  </style>
  <flex-row id="main-row">
    <div id="labels">
      <div id="sample-label"></div>
      <div id="case-label"></div>
    </div>
    <flex-row>
      <icon-button id="remove" icon="${ICONS.trash}"></icon-button>
    </flex-row>
  </flex-row>
`;

export class SampleRow extends ShadowBaseElement {
  private sampleLabelElem: HTMLDivElement;
  private caseLabelElem: HTMLDivElement;
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

    this.sampleLabelElem = this.root.querySelector("#sample-label");
    this.caseLabelElem = this.root.querySelector("#case-label");
    this.removeElem = this.root.querySelector("#remove");

    this.sampleLabelElem.textContent = this.sample.sampleId;
    this.caseLabelElem.textContent = `Case: ${formatCaseLabel(
      this.sample.caseId,
      this.sample.displayCaseId,
    )}`;
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
