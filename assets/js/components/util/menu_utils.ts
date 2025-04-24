import { STYLE } from "../../constants";

const style = STYLE.menu;

function div(text?: string) {
    const div = document.createElement("div");
    if (text != null) {
        div.innerHTML = text;
    }
    return div;
}

export function getSection(header: string, entries: string[]): HTMLDivElement {
    const container = div();
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const headerDiv = div(header);
    container.appendChild(headerDiv);

    for (const entry of entries) {
        const textDiv = div();
        container.appendChild(textDiv);
    }

    return container;

    // return comments.map((comment) => {
    //     const key = comment.created_at;
    //     const value = comment.comment;
    //     return getEntry({key, value})
    // })
}

export function getEntry(infoEntry: { key: string; url?: string; value: string }): HTMLDivElement {
    const { key, url, value } = infoEntry;
  
    const row = document.createElement("div");
    row.classList.add("entry");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = `${style.margin}px`;
    row.style.color = `${style.textColor}`;
  
    const label = document.createElement("div");
    label.classList.add("entry-key");
    label.textContent = key ?? "Info";
    label.style.fontWeight = `${style.headerFontWeight}`;
    label.style.color = `${style.textColor}`;
  
    let valueEl = document.createElement(url ? "a" : "div");
    valueEl.classList.add("entry-value");
    valueEl.style.flexShrink = "1";
    valueEl.style.minWidth = "0";
    valueEl.style.whiteSpace = "normal";
    valueEl.style.wordBreak = "break-word";
    valueEl.style.textAlign = "right";
    valueEl.style.textDecoration = "none";
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