export function formatValue(value: string): string {
  const num = parseFloat(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

export interface TableCell {
  value: string;
  color?: string;
}

export interface CreateTableOptions {
  header: string[];
  columns: string[];
  rows: TableCell[][];
}

export function createTable(options: CreateTableOptions): HTMLDivElement {
  const container = document.createElement("div");

  const { header, rows, columns } = options;

  const table = document.createElement("table");
  table.className = "meta-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const firstHead = document.createElement("th");
//   firstHead.textContent = rowHeader ?? "";
  headRow.appendChild(firstHead);
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const rowElem = createRow(row);
    tbody.appendChild(rowElem);
  }
  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}

function createRow(row: TableCell[]): HTMLTableRowElement {
  const rowElem = document.createElement("tr");
  const nameTd = document.createElement("td");
//   nameTd.textContent = row;
  rowElem.appendChild(nameTd);
  for (const cell of row) {
    const td = document.createElement("td");
    // const entry = data.find((d) => d.row === r && d.column === col);
    td.textContent = formatValue(cell.value);
    if (cell.color) {
        td.style.color = cell.color;
    }
    rowElem.appendChild(td);
  }
  return rowElem;
}
