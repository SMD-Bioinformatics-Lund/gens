import { COLORS, SIZES } from "../../constants";
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
      padding: ${SIZES.xs}px ${SIZES.m}px;
      border-radius: ${SIZES.xs}px;
    }
    :host(:hover) {
      background: ${COLORS.extraLightGray};
    }
    :host(:active) {
      background: ${COLORS.lightGray};
    }
    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
      background: ${COLORS.white};
      border-color: ${COLORS.lightGray};
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
    return ["icon", "disabled"];
  }

  constructor() {
    super(template);
  }

  public set icon(value: string) {
    console.log("Icon set to", value);
    this.setAttribute("icon", value);
  }

  public get icon(): string {
    return this.getAttribute("icon");
  }

  public set disabled(value: boolean) {
    if (value) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
  }

  public get disabled(): boolean {
    return this.hasAttribute("disabled");
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {

    const iconEl = this.root.querySelector("#icon") as HTMLElement;

    if (name === "icon") {
      iconEl.className = `fas ${newVal}`;
    }

    if (name === "disabled") {
      if (newVal !== null) {
        this.setAttribute("aria-disabled", "true");
      } else {
        this.removeAttribute("aria-disabled");
      }
    }
  }
}
customElements.define("icon-button", IconButton);
