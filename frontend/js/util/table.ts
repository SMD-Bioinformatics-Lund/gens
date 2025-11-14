export function formatValue(value: string): string {
  const num = parseFloat(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

export interface TableCell {
  value: string;
  color?: string;
}

export interface TableRowStyle {
  className?: string;
  cellClasses?: (string | undefined)[];
}

export interface TableOptions {
  columns: string[];
  rows: TableCell[][];
  rowNames: string[];
  rowNameHeader?: string;
  rowStyles?: (TableRowStyle | undefined)[];
}

export function createTable(options: TableOptions): HTMLDivElement {
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

function createRow(rowName: string, row: TableCell[], rowStyle?: TableRowStyle): HTMLTableRowElement {
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
