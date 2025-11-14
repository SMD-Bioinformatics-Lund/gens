import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import {
  createTable,
  TableOptions as TableData,
  formatValue,
  TableCell,
  TableRowStyle,
} from "../../util/table";
import { removeChildren } from "../../util/utils";
import { getEntry } from "../util/menu_utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const COPY_NUMBER_COLUMN = "Estimated chromosomal copy numbers";
const WARNING_ROW_CLASS = "meta-table__warning-row";
const WARNING_CELL_CLASS = "meta-table__warning-cell";
const MAX_COPY_NUMBER_DEVIATION = 0.1;

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
    let hasWarnings = false;

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
        const metaElements = getMetaElements(metas, sample.sex);
        for (const elem of metaElements.elements) {
          this.entries.appendChild(elem);
        }
        hasWarnings = hasWarnings || metaElements.hasWarnings;
      }
    }

    this.notifyWarningState(hasWarnings);
  }

  private notifyWarningState(hasWarnings: boolean) {
    if (this.lastWarningState === hasWarnings) {
      return;
    }
    this.lastWarningState = hasWarnings;
    this.warningHandler(hasWarnings);
  }
}

function getMetaElements(
  metas: SampleMetaEntry[],
  sex?: string,
): { elements: HTMLDivElement[]; hasWarnings: boolean } {
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
  // FIXME: Better way to check this globally?
  let hasWarnings = false;
  for (const meta of table_metas) {
    const { tableData, hasCopyNumberWarnings } = parseTableData(meta, sex);
    htmlEntries.push(createTable(tableData));
  }

  return { elements: htmlEntries, hasWarnings };
}

// FIXME: Very temporary
export function hasMetaWarnings(metas: SampleMetaEntry[], sex: string | null): boolean {
  for (const meta of metas) {
    const { hasCopyNumberWarnings } = parseTableData(meta, sex);
    if (hasCopyNumberWarnings) {
      return true;
    }
  }
  return false;
}

/**
 * This function takes long-format meta data and pivots it to wide-form data
 * I.e. to start with, each value lives on its own row
 * At the end, each data type has its own column, similar to how it is displayed
 *
 * @param meta
 * @returns
 */
function parseTableData(
  meta: SampleMetaEntry,
  sex?: string,
): { tableData: TableData; hasCopyNumberWarnings: boolean } {
  const grid = new Map<string, Map<string, TableCell>>();
  const colSet = new Set<string>();

  for (const cell of meta.data) {
    const rowName = cell.row_name;
    if (rowName == null) {
      continue;
    }
    colSet.add(cell.type);

    let rowMap = grid.get(rowName);
    if (!rowMap) {
      rowMap = new Map<string, TableCell>();
      grid.set(rowName, rowMap);
    }

    rowMap.set(cell.type, { value: cell.value, color: cell.color });
  }

  const rowNames = Array.from(grid.keys());
  const colNames = Array.from(colSet);

  const rows: TableCell[][] = rowNames.map((rowName) => {
    const rowMap = grid.get(rowName);
    return colNames.map((colName) => {
      return rowMap.get(colName) ?? { value: "", color: "" };
    });
  });

  const rowStyles = new Array<TableRowStyle | undefined>(rowNames.length);
  const copyNumberColIndex = colNames.indexOf(COPY_NUMBER_COLUMN);
  let hasCopyNumberWarnings = false;

  if (copyNumberColIndex >= 0) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const cell = row[copyNumberColIndex];

      if (exceedsCopyNumberDeviation(rowNames[rowIndex], cell?.value, sex)) {
        hasCopyNumberWarnings = true;
        if (!rowStyles[rowIndex]) {
          rowStyles[rowIndex] = { cellClasses: new Array(colNames.length) };
        }
        rowStyles[rowIndex]!.className = WARNING_ROW_CLASS;
        rowStyles[rowIndex]!.cellClasses![copyNumberColIndex] =
          WARNING_CELL_CLASS;
      }
    }
  }

  const hasRowStyles = rowStyles.some((style) => style != null);

  const tableData: TableData = {
    columns: colNames,
    rowNames: rowNames,
    rowNameHeader: meta.row_name_header ?? "",
    rows: rows,
    rowStyles: hasRowStyles ? rowStyles : undefined,
  };

  return { tableData, hasCopyNumberWarnings };
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


function exceedsCopyNumberDeviation(
  rowName: string,
  value?: string,
  sex?: string,
): boolean {
  const parsedValue = parseFloat(value ?? "");
  if (Number.isNaN(parsedValue)) {
    return false;
  }
  const normalizedRow = normalizeChromosomeLabel(rowName);
  const isMale = isMaleSex(sex);
  const targetValue =
    isMale && (normalizedRow === "X" || normalizedRow === "Y") ? 1 : 2;
  return Math.abs(parsedValue - targetValue) > MAX_COPY_NUMBER_DEVIATION;
}

function normalizeChromosomeLabel(label: string | undefined): string {
  if (!label) {
    return "";
  }
  return label
    .replace(/[^a-z0-9]/gi, "")
    .replace(/^CHR/i, "")
    .toUpperCase();
}

function isMaleSex(sex?: string): boolean {
  if (!sex) {
    return false;
  }
  const normalized = sex.trim().toLowerCase();
  return normalized === "male" || normalized === "m";
}

customElements.define("info-page", InfoMenu);
