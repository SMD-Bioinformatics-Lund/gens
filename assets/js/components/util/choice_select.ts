import Choices, { EventChoice, InputChoice } from "choices.js";
import { ShadowBaseElement } from "./shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css"/>
  <p>Header</p>
  <select id="select" multiple>
    <option value="volvo">A</option>
    <option value="saab">B</option>
  </select>
`;

export class ChoiceSelect extends ShadowBaseElement {
  private selectElement: HTMLSelectElement;
  private choiceElement: Choices;

  constructor() {
    super(template);
    this.selectElement = this.root.querySelector("#select");
    this.choiceElement = new Choices(this.selectElement, {
      placeholderValue: "Choices",
      removeItemButton: true,
      itemSelectText: "",
    });
  }

  initialize() {}

  connectedCallback(): void {}
}

customElements.define("choice-select", ChoiceSelect);
