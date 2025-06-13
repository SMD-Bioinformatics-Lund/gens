function formatValue(value: string): string {
  const num = parseFloat(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

// FIXME: Generalize the input
export function createTable(meta: SampleMetaEntry): HTMLDivElement {
  const container = document.createElement("div");
//   const header = document.createElement("div");
//   header.className = "sub-header";
// //   header.textContent = meta.file_name;
//   container.appendChild(header);

  const data = meta.data.filter(
    (d) => d.row_name != null,
  ) as (SampleMetaValue & { row_name: string })[];
  const types = Array.from(new Set(data.map((d) => d.type)));
  const rows = Array.from(new Set(data.map((d) => d.row_name)));

  const table = document.createElement("table");
  table.className = "meta-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const firstHead = document.createElement("th");
  firstHead.textContent = meta.row_name_header ?? "";
  headRow.appendChild(firstHead);
  for (const t of types) {
    const th = document.createElement("th");
    th.textContent = t;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const r of rows) {
    const row = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = r;
    row.appendChild(nameTd);
    for (const t of types) {
      const td = document.createElement("td");
      const entry = data.find((d) => d.row_name === r && d.type === t);
      if (entry) {
        td.textContent = formatValue(entry.value);
        if (entry.color) {
          td.style.color = entry.color;
        }
      }
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}
