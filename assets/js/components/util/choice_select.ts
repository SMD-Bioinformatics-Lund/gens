import Choices, { EventChoice, InputChoice } from "choices.js";
import { ShadowBaseElement } from "./shadowbaseelement";

// https://github.com/Choices-js/Choices/issues/805

// onClick does not seem to play well with being inside a shadow DOM
// Some adjustments were needed
Choices.prototype._onClick = function (event: MouseEvent) {

  // Previously the target ended up on outside the shadow DOM components
  // var target = event.target;

  // Now, getting the full path where we can check inside the shadow DOM whether
  // the select is clicked
  const path = event.composedPath?.() || [];
  const containerOuter = this.containerOuter;
  const clickWasWithinContainer = path.includes(containerOuter.element);

  // Previous line
  // var clickWasWithinContainer = containerOuter.element.contains(target);
  if (clickWasWithinContainer) {
    if (!this.dropdown.isActive && !containerOuter.isDisabled) {
      if (this._isTextElement) {
        if (document.activeElement !== this.input.element) {
          this.input.focus();
        }
      } else {
        this.showDropdown();
        containerOuter.element.focus();
      }
    } else if (
      this._isSelectOneElement &&
      event.target !== this.input.element &&
      !this.dropdown.element.contains(event.target)
    ) {
      this.hideDropdown();
    }
  } else {
    containerOuter.removeFocusState();
    this.hideDropdown(true);
    this.unhighlightAll();
  }
};

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css"/>
  <style>
    .choices__list--dropdown {
      z-index: 3000;
    }
  </style>
  <select id="select" multiple></select>
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

  setChoices(choices: InputChoice[]) {
    this.choiceElement.setChoices(choices);
  }

  getChoices(): EventChoice[] {
    return this.choiceElement.getValue() as EventChoice[];
  }

  initialize(changeCallback: (choiceIds: string[]) => void) {
    this.selectElement.addEventListener("change", () => {
      const selectedIds = this.choiceElement.getValue(true) as string[];
      changeCallback(selectedIds);
    })
  }
}

customElements.define("choice-select", ChoiceSelect);
