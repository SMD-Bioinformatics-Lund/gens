import { ShadowBaseElement } from "./shadowbase";

const template = document.createElement("template");
// FIXME: Use style constants
template.innerHTML = String.raw`
  <style>
    :host {
      background: white;
      border: 1px solid #ccc;
      padding: 12px;
      boxShadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      zIndex: 1000;
      font-family: sans-serif;
      max-width: 320px;
      font-size: 14px;
      border-radius: 6px;
    }
    #header {
      font-weight: 600;
      font-size: 16px;
      color: #222;
      margin-bottom: 8px;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      color: #444;
    }
    .entry-key {
      font-weight: 500;
      color: #555;
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
      gap: 8px;
    }
    #close-popup {
      background: transparent;
      border: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #888;
      padding: 0;
      margin-left: 12px;
    }
    #close-popup:hover {
      color: #000;
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
        // const node = document.createElement("div");
        // if (url == undefined) {
        //   node.textContent = `${key}: ${value}`;
        // } else {
        //   const urlNode = document.createElement("a");
        //   urlNode.href = url;
        //   urlNode.textContent = `${key}: ${value}`;
        //   node.appendChild(urlNode);
        // }
        const node = getEntry(infoEntry)
        entriesContainer.appendChild(node);
      }
    }
    // label.innerHTML = text;
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
