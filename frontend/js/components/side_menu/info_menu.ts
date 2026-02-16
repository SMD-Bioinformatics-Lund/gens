import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import {
  META_WARNING_CELL_CLASS,
  META_WARNING_ROW_CLASS,
} from "../../util/meta_warnings";
import { createTable, formatValue, parseTableFromMeta } from "../../util/table";
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
    .table-wrapper {
      overflow-x: auto;
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
    table.meta-table tr.${META_WARNING_ROW_CLASS} {
      background: rgba(255, 0, 0, 0.15);
    }
    table.meta-table td.${META_WARNING_CELL_CLASS} {
      background: rgba(255, 0, 0, 0.3);
      font-weight: ${FONT_WEIGHT.header};
    }
  </style>
  <div id="entries"></div>
`;

export class InfoMenu extends ShadowBaseElement {
  private entries!: HTMLDivElement;
  private getSamples!: () => Sample[];
  private getErrors!: (metaId: string) => { row: string; col: string }[];
  private getSampleLabel!: (sample: Sample) => string;
  private getCaseLabel!: (sample: Sample) => string;

  constructor() {
    super(template);
  }

  setSources(
    getSamples: () => Sample[],
    getErrors: (metaId: string) => { row: string; col: string }[],
    getSampleLabel: (sample: Sample) => string,
    getCaseLabel: (sample: Sample) => string,
  ) {
    this.getSamples = getSamples;
    this.getErrors = getErrors;
    this.getSampleLabel = getSampleLabel;
    this.getCaseLabel = getCaseLabel;
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

    for (const sample of samples) {
      const header = document.createElement("div");
      header.className = "header";
      header.textContent = this.getSampleLabel(sample);
      this.entries.appendChild(header);

      const simpleDivs = [];
      const tables = [];

      simpleDivs.push(getEntry({ key: "Case ID", value: this.getCaseLabel(sample) }));

      if (sample.sampleType) {
        simpleDivs.push(
          getEntry({ key: "Sample type", value: sample.sampleType }),
        );
      }
      // Optional fields
      const sex = sample.sex;
      if (sex != null) {
        simpleDivs.push(getEntry({ key: "Sex", value: sex }));
      }
      const metas = sample.meta;

      if (metas != null) {
        for (const meta of metas) {
          // Simple entry
          if (meta.row_name_header == null) {
            const divs = getSimpleElement(meta);
            for (const div of divs) {
              simpleDivs.push(div);
            }
            continue;
          }

          // Table entry
          const errors = this.getErrors(meta.id);

          const { tableData } = parseTableFromMeta(meta, errors);
          const htmlTable = createTable(tableData);
          tables.push(htmlTable);
        }
      }

      for (const div of simpleDivs) {
        div.style.paddingRight = `${SIZES.m}px`;
        this.entries.appendChild(div);
      }

      for (const table of tables) {
        this.entries.appendChild(table);
      }
    }
  }
}

function getSimpleElement(meta: SampleMetaEntry): HTMLDivElement[] {
  const htmlEntries: HTMLDivElement[] = [];
  for (const entry of meta.data) {
    const htmlEntry = getEntry({
      key: entry.type,
      value: formatValue(entry.value),
      color: entry.color,
    });
    htmlEntries.push(htmlEntry);
  }
  return htmlEntries;
}

customElements.define("info-page", InfoMenu);
