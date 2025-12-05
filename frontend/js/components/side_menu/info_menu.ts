import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import { createTable, formatValue, parseTableFromMeta } from "../../util/table";
import { removeChildren } from "../../util/utils";
import { getEntry } from "../util/menu_utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const WARNING_ROW_CLASS = "meta-table__warning-row";
const WARNING_CELL_CLASS = "meta-table__warning-cell";

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
    table.meta-table tr.${WARNING_ROW_CLASS} {
      background: rgba(255, 0, 0, 0.15);
    }
    table.meta-table td.${WARNING_CELL_CLASS} {
      background: rgba(255, 0, 0, 0.3);
      font-weight: ${FONT_WEIGHT.header};
    }
  </style>
  <div id="entries"></div>
`;

export class InfoMenu extends ShadowBaseElement {
  private entries!: HTMLDivElement;
  private getSamples!: () => Sample[];

  private warningHandler?: (hasWarning: boolean) => void;
  private lastWarningState = false;

  constructor() {
    super(template);
  }

  setSources(getSamples: () => Sample[]) {
    this.getSamples = getSamples;
  }

  setWarningHandler(onWarningChange: (hasWarning: boolean) => void) {
    this.warningHandler = onWarningChange;
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

      if (metas != null) {
        const elements = getMetaElements(metas);
        for (const elem of elements) {
          this.entries.appendChild(elem);
        }
      }
    }
  }
}

function getMetaElements(metas: SampleMetaEntry[]): HTMLDivElement[] {
  const simple_metas = metas.filter((meta) => meta.row_name_header == null);

  const htmlEntries: HTMLDivElement[] = [];
  for (const meta of simple_metas) {
    for (const entry of meta.data) {
      const htmlEntry = getEntry({
        key: entry.type,
        value: formatValue(entry.value),
        color: entry.color,
      });
      htmlEntries.push(htmlEntry);
    }
  }

  const table_metas = metas.filter((meta) => meta.row_name_header != null);
  for (const meta of table_metas) {
    const { tableData } = parseTableFromMeta(meta);
    htmlEntries.push(createTable(tableData));
  }

  return htmlEntries;
}

// function getSampleHasWarning(meta: SampleMetaEntry, sex: string | null): boolean {

//   for (const row of meta.)

//   const rowStyles = new Array<TableRowStyle | undefined>(rowNames.length);
//   const copyNumberColIndex = colNames.indexOf(COPY_NUMBER_COLUMN);
//   let hasCopyNumberWarnings = false;

//   if (copyNumberColIndex >= 0) {
//     for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
//       const row = rows[rowIndex];
//       const cell = row[copyNumberColIndex];

//       if (exceedsCopyNumberDeviation(rowNames[rowIndex], cell?.value, sex)) {
//         hasCopyNumberWarnings = true;
//         if (!rowStyles[rowIndex]) {
//           rowStyles[rowIndex] = { cellClasses: new Array(colNames.length) };
//         }
//         rowStyles[rowIndex]!.className = WARNING_ROW_CLASS;
//         rowStyles[rowIndex]!.cellClasses![copyNumberColIndex] =
//           WARNING_CELL_CLASS;
//       }
//     }
//   }

// }

customElements.define("info-page", InfoMenu);
