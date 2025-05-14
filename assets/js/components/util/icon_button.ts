import { COLORS } from "../../constants";
import { ShadowBaseElement } from "./shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    :host {
      display: inline-block;
      width: auto;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      background-color: ${COLORS.white};
      cursor: pointer;
      border: 1px solid ${COLORS.lightGray};
      padding: 4px 8px;
      border-radius: 4px;
    }
    #icon {
      font-size: 1em;
    }
    .icon-button:hover {
      background: ${COLORS.extraLightGray};
    }
    /* FIXME: Nicer button response colors */
    .icon-button:active {
      background: ${COLORS.lightGray};
    }
  </style>
  <div id="icon" class="fas"></div>
`;
export class IconButton extends ShadowBaseElement {

  static get observedAttributes() {
    return ["icon"];
  }

  constructor() {
    super(template);
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === "icon" && this.root) {
      const iconEl = this.root.querySelector("#icon") as HTMLElement;
      iconEl.className = `fas ${newVal}`;
    }
  }
}
customElements.define("icon-button", IconButton);
