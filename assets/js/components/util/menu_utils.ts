import { STYLE } from "../../constants";

const style = STYLE.menu;

export function getContainer(type: "row" | "column", text?: string) {
  const row = document.createElement("div");
  row.className = `menu-${type}`;
  if (text != null) {
    row.appendChild(getDiv(text));
  }
  return row;
}

export function getDiv(text?: string) {
  const div = document.createElement("div");
  if (text != null) {
    div.innerHTML = text;
  }
  return div;
}

export function getAHref(label: string, href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.innerHTML = label;
  a.href = href;
  return a;
}

export function makeRefDiv(name: string, pmid?: string, url?: string): HTMLDivElement {
  const row = getContainer("row");

  row.appendChild(getDiv(name));
  if (url != null) {
    row.appendChild(getDiv(",&nbsp;"))
    row.appendChild(getAHref("URL", url));
  }
  if (pmid != null) {
    row.appendChild(getDiv(`, PMID: ${pmid}`))
  }
  return row;
}

function labelDiv(text: string): HTMLDivElement {
  const label = document.createElement("div");
  label.classList.add("entry-key");
  label.textContent = text;
  label.style.fontWeight = `${style.headerFontWeight}`;
  label.style.color = `${style.textColor}`;
  return label;
}

export function getSection(header: string, entries: HTMLDivElement[]): HTMLDivElement {
  const container = getContainer("column");

  const headerRow = getContainer("row");
  const headerDiv = labelDiv(header);
  headerRow.appendChild(headerDiv);
  container.appendChild(headerRow);

  if (entries.length > 0) {
    for (const entry of entries) {
      container.appendChild(entry);
    }
  } else {
    container.appendChild(getDiv("No comments"));
  }

  return container;
}

export function getEntry(infoEntry: {
  key: string;
  url?: string;
  value: string;
}): HTMLDivElement {
  const { key, url, value } = infoEntry;

  const row = getContainer("row");

  const label = labelDiv(key ?? "Info");

  let valueEl = document.createElement(url ? "a" : "div");
  valueEl.classList.add("menu-row-value");
  if (url) {
    valueEl = valueEl as HTMLAnchorElement;
    valueEl.href = url;
    valueEl.target = "_blank";
    valueEl.rel = "noopener noreferrer";
  }
  valueEl.textContent = value;

  row.appendChild(label);
  row.appendChild(valueEl);
  return row;
}
