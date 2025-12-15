import {
  META_WARNING_CELL_CLASS,
  META_WARNING_ROW_CLASS,
} from "./meta_warnings";

export function formatValue(value: string): string {
  const num = parseFloat(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

export function createTable(options: TableData): HTMLDivElement {
  const container = document.createElement("div");

  container.className = "table-wrapper";
  container.style.overflowX = "auto";

  const { rows, columns, rowNames, rowNameHeader, rowStyles } = options;

  const table = document.createElement("table");
  table.className = "meta-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const firstHead = document.createElement("th");
  firstHead.textContent = rowNameHeader ?? "";
  headRow.appendChild(firstHead);
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row, index) => {
    const rowElem = createRow(rowNames[index] ?? "", row, rowStyles?.[index]);
    tbody.appendChild(rowElem);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}

function createRow(
  rowName: string,
  row: TableCell[],
  rowStyle: string | null,
): HTMLTableRowElement {
  const rowElem = document.createElement("tr");
  if (rowStyle) {
    rowElem.classList.add(rowStyle);
  }
  const nameTd = document.createElement("td");
  nameTd.textContent = rowName;
  rowElem.appendChild(nameTd);
  for (const cell of row) {
    const td = document.createElement("td");
    td.textContent = cell.value;
    if (cell.class) {
      td.classList.add(cell.class);
    }
    rowElem.appendChild(td);
  }
  return rowElem;
}

/**
 * This function takes long-format meta data and pivots it to wide-form data
 * I.e. to start with, each value lives on its own row
 * At the end, each data type has its own column, similar to how it is displayed
 *
 * @param meta
 * @returns Table
 */
export function parseTableFromMeta(
  meta: SampleMetaEntry,
  warnings: { row: string; col: string }[],
): Table {
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

    rowMap.set(cell.type, { value: cell.value });
  }

  const rowNames = Array.from(grid.keys());
  const colNames = Array.from(colSet);

  const rows: TableCell[][] = rowNames.map((rowName) => {
    const rowMap = grid.get(rowName);

    return colNames.map((colName) => {
      const cell = rowMap.get(colName);

      if (cell) {
        const cellWarning = warnings.find(
          (coord) => coord.row == rowName && coord.col == colName,
        );
        if (cellWarning) {
          cell.class = META_WARNING_CELL_CLASS;
        }
        return cell;
      } else {
        return { value: "", color: "" };
      }
    });
  });

  const warningRows = warnings.map((coord) => coord.row);
  const rowStyles = [];
  for (const rowName of rowNames) {
    let rowStyle = undefined;
    if (warningRows.includes(rowName)) {
      rowStyle = META_WARNING_ROW_CLASS;
    }
    rowStyles.push(rowStyle);
  }

  const tableData: TableData = {
    columns: colNames,
    rowNames: rowNames,
    rowNameHeader: meta.row_name_header ?? "",
    rows: rows,
    rowStyles: rowStyles,
  };

  return new Table(tableData);
}

export class Table {
  tableData: TableData;
  constructor(tableData: TableData) {
    this.tableData = tableData;
  }

  getColumnNames(): string[] {
    return this.tableData.columns;
  }

  hasColumn(colName: string) {
    return this.tableData.columns.includes(colName);
  }

  getColumn(colName: string): TableCell[] {
    const colIndex = this.tableData.columns.indexOf(colName);
    if (colIndex > -1) {
      const column = this.tableData.rows.map((row) => row[colIndex]);
      return column;
    }
    throw Error(
      `Did not find column ${colName} among columns ${this.tableData.columns}`,
    );
  }
}
