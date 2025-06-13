import { FONT_WEIGHT, SIZES } from "../../constants";
import { removeChildren } from "../../util/utils";
import { getEntry } from "../util/menu_utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    .header {
      font-weight: ${FONT_WEIGHT.header};
      margin-top: ${SIZES.m}px;
      margin-bottom: ${SIZES.xs}pxl            
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.xs}px;
    }
  </style>
  <div id="entries"></div>
`;

export class InfoMenu extends ShadowBaseElement {
  private entries!: HTMLDivElement;
  private getSamples!: () => Sample[];

  constructor() {
    super(template);
  }

  setSources(getSamples: () => Sample[]) {
    this.getSamples = getSamples;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.entries = this.root.querySelector("#entries");
  }

  render() {
    if (!this.isConnected) {
      return;
    }
    removeChildren(this.entries);
    const samples = this.getSamples ? this.getSamples() : [];

    console.log(samples);

    for (const sample of samples) {
      const header = document.createElement("div");
      header.className = "header";
      header.textContent = sample.sampleId;
      this.entries.appendChild(header);

      this.entries.appendChild(
        getEntry({ key: "Case ID", value: sample.caseId }),
      );
      if (sample.sampleType) {
        this.entries.appendChild(
          getEntry({ key: "Sample type", value: sample.sampleType }),
        );
      }
      // Optional fields
      const sex = sample.sex;
      if (sex != null) {
        this.entries.appendChild(getEntry({ key: "Sex", value: sex }));
      }
      const metas = sample.meta;
      if (metas != null && Array.isArray(metas)) {
        for (const meta of metas) {
          for (const entry of meta.data) {
            this.entries.appendChild(
              getEntry({ key: entry.type, value: entry.value }),
            );
          }
        }
      }
    }
  }
}

customElements.define("info-page", InfoMenu);
