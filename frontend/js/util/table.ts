export function formatValue(value: string): string {
  const num = parseFloat(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

export interface TableCell {
  value: string;
  color?: string;
}

export interface TableOptions {
  columns: string[];
  rows: TableCell[][];
  rowNames: string[];
  rowNameHeader?: string;
}

export function createTable(options: TableOptions): HTMLDivElement {
  const container = document.createElement("div");

  container.className = "table-wrapper";
  container.style.overflowX = "auto";

  const { rows, columns, rowNames, rowNameHeader } = options;

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
    const rowElem = createRow(rowNames[index] ?? "", row);
    tbody.appendChild(rowElem);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}

function createRow(rowName: string, row: TableCell[]): HTMLTableRowElement {
  const rowElem = document.createElement("tr");
  const nameTd = document.createElement("td");
  nameTd.textContent = rowName;
  rowElem.appendChild(nameTd);
  for (const cell of row) {
    const td = document.createElement("td");
    td.textContent = cell.value;
    if (cell.color) {
      td.style.color = cell.color;
    }
    rowElem.appendChild(td);
  }
  return rowElem;
}
