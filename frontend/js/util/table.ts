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
  rowStyle?: TableRowStyle,
): HTMLTableRowElement {
  const rowElem = document.createElement("tr");
  if (rowStyle?.className) {
    rowElem.classList.add(rowStyle.className);
  }
  const nameTd = document.createElement("td");
  nameTd.textContent = rowName;
  rowElem.appendChild(nameTd);
  row.forEach((cell, index) => {
    const td = document.createElement("td");
    td.textContent = cell.value;
    if (cell.color) {
      td.style.color = cell.color;
    }
    const cellClass = rowStyle?.cellClasses?.[index];
    if (cellClass) {
      td.classList.add(cellClass);
    }
    rowElem.appendChild(td);
  });
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
  errors: Coord[],
): Table {
  const grid = new Map<string, Map<string, TableCell>>();
  const colSet = new Set<string>();

  const errorRows = errors.map((coord) => coord.y);

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

  const rows: TableCell[][] = rowNames.map((rowName, rowIndex) => {
    const rowMap = grid.get(rowName);

    return colNames.map((colName, colIndex) => {
      const color = errorRows.includes(rowIndex) ? "red" : "";

      return rowMap.get(colName) ?? { value: "", color };
    });
  });

  // const rowStyles = new Array<TableRowStyle | undefined>(rowNames.length);
  // const copyNumberColIndex = colNames.indexOf(COPY_NUMBER_COLUMN);
  // let hasCopyNumberWarnings = false;

  // if (copyNumberColIndex >= 0) {
  //   for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
  //     const row = rows[rowIndex];
  //     const cell = row[copyNumberColIndex];

  //     if (exceedsCopyNumberDeviation(rowNames[rowIndex], cell?.value, sex)) {
  //       hasCopyNumberWarnings = true;
  //       if (!rowStyles[rowIndex]) {
  //         rowStyles[rowIndex] = { cellClasses: new Array(colNames.length) };
  //       }
  //       rowStyles[rowIndex]!.className = WARNING_ROW_CLASS;
  //       rowStyles[rowIndex]!.cellClasses![copyNumberColIndex] =
  //         WARNING_CELL_CLASS;
  //     }
  //   }
  // }

  // const hasRowStyles = rowStyles.some((style) => style != null);

  const tableData: TableData = {
    columns: colNames,
    rowNames: rowNames,
    rowNameHeader: meta.row_name_header ?? "",
    rows: rows,
    // rowStyles: hasRowStyles ? rowStyles : undefined,
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
