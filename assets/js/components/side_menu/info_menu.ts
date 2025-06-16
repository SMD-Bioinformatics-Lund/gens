import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import {
  createTable,
  TableOptions as TableData,
  formatValue,
  TableCell,
} from "../../util/table";
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
        const metaElements = getMetaElements(metas);
        for (const elem of metaElements) {
          this.entries.appendChild(elem);
        }
      }
    }
  }
}

function getMetaElements(metas: SampleMetaEntry[]): HTMLDivElement[] {
  const simple_metas = metas.filter((meta) => meta.row_name_header == null);

  const htmlEntries = [];
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
    const tableData = parseTableData(meta);
    htmlEntries.push(createTable(tableData));
  }

  return htmlEntries;
}

/**
 * This function takes long-format meta data and pivots it to wide-form data
 * I.e. to start with, each value lives on its own row
 * At the end, each data type has its own column, similar to how it is displayed
 *
 * @param meta
 * @returns
 */
function parseTableData(meta: SampleMetaEntry): TableData {

  const grid = new Map<string, Map<string, TableCell>>();
  const colSet = new Set<string>();

  for (const cell of meta.data) {
    const rowName = cell.row_name;
    if (rowName == null) {
      continue;
    }

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

  const tableData: TableData = {
    columns: colNames,
    rowNames: rowNames,
    rowNameHeader: meta.row_name_header ?? "",
    rows: rows,
  };

  return tableData;
}

customElements.define("info-page", InfoMenu);
