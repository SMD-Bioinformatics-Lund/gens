import { STYLE } from "../../constants";

const style = STYLE.menu;

export function getAHref(label: string, href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.innerHTML = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}



export function getURLRow(text: string) {

  console.log("Generating row for text", text);

  const row = getContainer("row");
  const span = document.createElement("span");

  // FIXME: Think a bit about how to generalize this
  // const regStrs = [
  //   "PMID: \s*(\d+)",
  //   "https?:\/\/[^\s\)]+",
  //   "www\.[^\s\)]+",
  //   "OMIM #(\d+)",
  //   "ORPHA: (\d+)"
  // ];
  // const regExps = regStrs.map((rs) => new RegExp(rs, "g"));

  // const hits = regExps.map((regExp) => {
  //   const hits = [...text.matchAll(regExp)];
  //   return hits;
  // }).filter((hits) => hits.length > 0);

  // console.log(hits);

  // const matches = text.matchAll(pmid_regexes[0])

  const pmid_regex = /(PMID: \s*(\d+))|(https?:\/\/[^\s\)]+)|(www\.[^\s\)]+)|(OMIM #(\d+))|(ORPHA:\s*(\d+))/g;

  const groups = {
    pmid: 1,
    pmidId: 2,
    http: 3,
    www: 4,
    omim: 5,
    omimId: 6,
    orpha: 7,
    orphaId: 8,
  }

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pmid_regex.exec(text)) != null) {
    console.log("Match at index", match.index);
    if (match.index > lastIndex) {
      span.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index)),
      );
    }

    const pmid_match = match[groups.pmid];
    let url: string;
    let label: string;
    let prefix: string|null = null;
    if (pmid_match) {
      const pmid = match[groups.pmidId];
      prefix = "PMID: ";
      label = pmid;
      url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}`
    } else if (match[groups.http] || match[groups.www]) {
      url = match[groups.http] || match[groups.www];

      label = url;
      if (match[groups.www]) {
        url = "http://" + url;
      }
      // const a = getAHref(url, match[3] || match[4]);
      // span.appendChild(a);
    } else if (match[groups.omim]) {
      const omimId = match[groups.omimId];
      prefix = "OMIM #";
      label = omimId;
      url = `https://omim.org/entry/${omimId}`;
    } else if (match[groups.orpha]) {
      const orphaId = match[groups.orphaId];
      prefix = "ORPHA: ";
      label = orphaId;
      url = `https://www.orpha.net/en/disease/detail/${orphaId}`;
    }
    if (prefix != null) {
      const prefixSpan = document.createTextNode(prefix);
      span.appendChild(prefixSpan);
    }
    const aHref = getAHref(label, url);
    span.appendChild(aHref);

    lastIndex = pmid_regex.lastIndex;
  }

  if (lastIndex < text.length) {
    span.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  // span.innerHTML = text;
  row.appendChild(span);

  return row;
}

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

export function makeRefDiv(
  name: string,
  pmid?: string,
  url?: string,
): HTMLDivElement {
  const row = getContainer("row");

  row.appendChild(getDiv(name));
  if (url != null) {
    row.appendChild(getDiv(",&nbsp;"));
    row.appendChild(getAHref("URL", url));
  }
  if (pmid != null) {
    row.appendChild(getDiv(`, PMID: ${pmid}`));
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

export function getSection(
  header: string,
  entries: HTMLDivElement[],
): HTMLDivElement {
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
