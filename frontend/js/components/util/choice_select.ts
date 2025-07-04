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

  /* Kudos to ChatGPT for making this mess work. Big FIXME to clean this up. Will see if that happens. */

  /* 1. Vertically center items & tighten up their padding */
  .choices__list--dropdown .choices__item,
  .choices__list[aria-expanded] .choices__item {
    display: flex;            /* switch to flex to align contents */
    align-items: center;      /* vertically center text/icon */
    padding: 4px 8px !important;  /* smaller top/bottom & left/right padding */
    box-sizing: border-box;   /* include padding in width */
  }

  /* 2. Shrink the “selected” single value box and input padding */
  .choices__inner {
    padding: 4px 8px !important;  /* match dropdown items */
    min-height: auto !important;  /* let it collapse */
    height: auto !important;
    box-sizing: border-box;
  }

  /* 3. Keep the dropdown from overshooting to the right */
  .choices__list--dropdown,
  .choices__list[aria-expanded] {
    width: auto !important;       /* allow its content width */
    max-width: 100% !important;   /* but never exceed container */
    max-height: 200px;
    overflow-y: auto !important;  /* allow vertical scroll */
  }

  /* 4. Tuck the arrow back in if needed */
  .choices[data-type*="select-one"] .choices__inner::after {
    right: 8px !important;        /* pull arrow back towards text */
  }

  /* 5. Ensure host/container shows full dropdown */
  :host,
  :host * {
    overflow: visible !important;
  }

  </style>
  <select id="select"></select>
`;

export class ChoiceSelect extends ShadowBaseElement {
  private selectElement: HTMLSelectElement;
  private choiceElement: Choices;

  static get observedAttributes() {
    return ["multiple"];
  }

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();

    const isMultipleMode = this.hasAttribute("multiple");

    this.selectElement = this.root.querySelector("#select");

    if (isMultipleMode) {
      this.selectElement.setAttribute("multiple", "");
    } else {
      this.selectElement.removeAttribute("multiple");
    }

    if (!this.choiceElement) {
      this.choiceElement = new Choices(this.selectElement, {
        placeholderValue: "",
        removeItemButton: isMultipleMode,
        itemSelectText: "",
        shouldSort: false,
        renderChoiceLimit: 20,
        searchResultLimit: 50,
      });
  
      this.selectElement.addEventListener("change", () => {
  
        const vals = this.choiceElement.getValue(true) as string[];
        this.dispatchEvent(
          new CustomEvent("change", {
            detail: { values: vals },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
  }

  setValues(values: InputChoice[]) {
    this.choiceElement.clearChoices();
    this.choiceElement.clearStore();
    this.choiceElement.setChoices(values);
  }

  getValues(): EventChoice[] {
    return this.choiceElement.getValue() as EventChoice[];
  }

  getValue(): EventChoice | null {

    return this.choiceElement.getValue()
      ? (this.choiceElement.getValue() as EventChoice)
      : null;
  }
}

customElements.define("choice-select", ChoiceSelect);
