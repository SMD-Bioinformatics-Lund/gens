import { STYLE } from "../../constants";
import { ShadowBaseElement } from "./shadowbase";

const style = STYLE.popup;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      background: ${style.backgroundColor};
      border: ${style.borderWidth}px solid ${style.borderColor};
      padding: ${style.padding}px;
      zIndex: 1000;
      font-family: ${style.font};
      max-width: 320px;
      border-radius: ${style.borderRadius}px;
    }
    #header {
      font-weight: ${style.headerFontWeight};
      font-size: ${style.headerSize}px;
      color: ${style.textColor};
      margin-bottom: ${style.margin}px;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${style.entryGap}px;
    }
    .entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: ${style.margin}px;
      color: ${style.textColor};
    }
    .entry-key {
      font-weight: ${style.breadFontWeight};
      color: ${style.textColor};
    }
    .entry-value {
      flex-shrink: 0;
      text-align: right;
      text-decoration: none;
    }
    #container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    #content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: ${style.margin}px;
    }
    #close-popup {
      background: transparent;
      border: none;
      font-size: ${style.headerSize}px;
      line-height: 1;
      cursor: pointer;
      color: ${style.closeColor};
      padding: 0;
      margin-left: ${style.padding}px;
    }
    #close-popup:hover {
      color: ${style.textColor};
    }
  </style>
  <div id="container">
    <div id="content">
      <div id="header"></div>
      <div id="entries"></div>
    </div>
    <button id="close-popup">&times;</button>
  </div>
`;


export class GensPopup extends ShadowBaseElement {
  constructor() {
    super(template);
  }

  setContent(content: PopupContent) {
    const header = this.root.querySelector("#header");
    header.textContent = content.header;
    const infoEntries = content.info;
    if (infoEntries != undefined) {
      const entriesContainer = this.root.querySelector("#entries");

      for (const infoEntry of infoEntries) {
        const node = getEntry(infoEntry)
        entriesContainer.appendChild(node);
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();

    const closeButton = this.root.querySelector("#close-popup");
    closeButton.addEventListener("click", () => {
      console.log("Close clicked");
      this.remove();
    });
  }
}

function getEntry(infoEntry: {key: string, url?: string, value: string}) {
  const { key, url, value } = infoEntry;

  const row = document.createElement("row");
  row.classList.add("entry");

  const label = document.createElement("div");
  label.classList.add("entry-key");
  label.textContent = key ?? "Info";

  let valueEl = document.createElement(url ? "a" : "div");
  valueEl.classList.add("entry-value");
  if (url) {
    valueEl = valueEl as HTMLAnchorElement
    valueEl.href = url;
    valueEl.target = "_blank";
    valueEl.rel = "noopener noreferrer";
  }
  valueEl.textContent = value;

  row.appendChild(label);
  row.appendChild(valueEl);
  return row;
}

customElements.define("gens-popup", GensPopup);
