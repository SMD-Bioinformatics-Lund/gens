import { ShadowBaseElement } from "./shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: flex;
      flex-direction: row;
      align-items: center;
    }
  </style>
  <slot></slot>
`;
class Row extends ShadowBaseElement {
  constructor() {
    super(template);
  }
}
customElements.define("flex-row", Row);
