import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import { createTable, TableOptions as TableData, formatValue, TableCell } from "../../util/table";
import { removeChildren, stringToHash } from "../../util/utils";
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
        const simple_metas = metas.filter(
          (meta) => meta.row_name_header == null,
        );

        // FIXME: Extract utility
        for (const meta of simple_metas) {



          for (const entry of meta.data) {
            this.entries.appendChild(
              getEntry({
                key: entry.type,
                value: formatValue(entry.value),
                color: entry.color,
              }),
            );
          }
        }

        const table_metas = metas.filter(
          (meta) => meta.row_name_header != null,
        );

        for (const meta of table_metas) {

          const tableData = parseTableData(meta);

          console.log("Table data", tableData);

          this.entries.appendChild(createTable(tableData));
        }
      }
    }
  }
}

// Can we assume linear data here? Then we can just layer out
// the data which each new row
function parseTableData(meta: SampleMetaEntry): TableData {

  const rowNames: string[] = [];
  const colNames: string[] = [];
  const rowEntries: Record<string, SampleMetaValue[]> = {};

  for (const cell of meta.data) {
    const rowName = cell.row_name;
    if (rowName == null) {
      continue;
    }

    if (!rowEntries[rowName]) {
      rowEntries[rowName] = [];
      rowNames.push(rowName)
    }

    if (!colNames.includes(cell.type)) {
      console.log("Adding the col name", cell.type);
      colNames.push(cell.type)
    }
    rowEntries[rowName].push(cell);
  }

  const tableRows: TableCell[][] = [];

  console.log("Iterating", rowNames);

  for (const rowName of rowNames) {
    const tableRow = [];
    for (const cell of rowEntries[rowName]) {
      const tableCell: TableCell = {
        value: cell.value,
        color: cell.color,
      }
      tableRow.push(tableCell);
    }
    tableRows.push(tableRow);
  }

  const tableData: TableData = {
    columns: colNames,
    rowNames: rowNames,
    rowNameHeader: meta.row_name_header ?? "",
    rows: tableRows,
  }

  return tableData;
}

customElements.define("info-page", InfoMenu);
