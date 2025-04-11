import { ShadowBaseElement } from "./shadowbase";

const template = document.createElement("template");
// FIXME: Use style constants
template.innerHTML = String.raw`
  <style>
    :host {
      background: white;
      border: 1px solid #ccc;
      padding: 8px;
      boxShadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      zIndex: 1000;
      font-family: sans-serif;
      max-width: 300px;
    }
    #container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #content {
      display: flex;
      flex-direction: column;
    }
    #close-popup {
      background: transparent;
      border: none;
      font-size: 16px;
      margin-left: 8px;
      cursor: pointer;
    }
  </style>
  <div id="container">
    <div id="content">
      <h3 id="header"></h3>
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
    header.innerHTML = content.header;
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

customElements.define("gens-popup", GensPopup);
