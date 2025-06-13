import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import { createTable } from "../../util/table";
import { removeChildren } from "../../util/utils";
import { getEntry } from "../util/menu_utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    .header {
      font-weight: ${FONT_WEIGHT.header};
      margin-top: ${SIZES.m}px;
      margin-bottom: ${SIZES.xs}px;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.xs}px;
    }
    .sub-header {
      font-weight: ${FONT_WEIGHT.bold};
      margin-top: ${SIZES.xs}px;
    }
    .menu-row {
      align-items: center;
      padding: ${SIZES.xs}px 0px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    .menu-row-value {
      flex-shrink: 1;
      min-width: 0;
      white-space: normal;
      word-break: break-word;
      text-align: right;
      text-decoration: none;
    }
    table.meta-table {
      border-collapse: collapse;
      width: auto;
      max-width: 100%;
      margin-bottom: ${SIZES.s}px;
      font-size: 12px;
      table-layout: auto;
    }
    table.meta-table th,
    table.meta-table td {
      border: 1px solid ${COLORS.lightGray};
      padding: ${SIZES.xxs}px ${SIZES.xs}px;
      text-align: left;
    }
    table.meta-table th {
      background: ${COLORS.extraLightGray};
      font-weight: ${FONT_WEIGHT.header};
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
          const hasRowName = meta.data.every((d) => d.row_name != null);

          if (hasRowName) {
            this.entries.appendChild(createTable(meta));
          } else {
            for (const entry of meta.data) {
              if (entry.row_name == null) {
                this.entries.appendChild(
                  getEntry({
                    key: entry.type,
                    value: entry.value,
                    color: entry.color,
                  }),
                );
              }
            }
          }
        }
      }
    }
  }
}

customElements.define("info-page", InfoMenu);
