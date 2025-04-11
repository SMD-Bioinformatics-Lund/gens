import { ShadowBase } from "./shadowbase";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      background: white;
      border: 1px solid #ccc;
      padding: 8px;
      boxShadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      zIndex: 1000;
    }
    #container {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
    <span id="label">Text</span>
    <button id="close-popup">&times;</button>
  </div>
`;

export class GensPopup extends ShadowBase {
  constructor() {
    super(template);
  }

  setContent(text: string) {
    const label = this.root.querySelector("#label");
    label.innerHTML = text;
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
