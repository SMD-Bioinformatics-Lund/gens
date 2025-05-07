import { ICONS, SIZES } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    #button-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: ${SIZES.s}px;
    }
    .button {
      cursor: pointer;
      /* FIXME: Style constants */
      border: 1px solid #ccc;
      padding: 4px 8px;
      borderRadius: 4px;
    }
  </style>
  <div id="button-row">
    <div label="Move up" class="button fas ${ICONS.up}">A</div>
    <div label="Move down" class="button fas ${ICONS.down}">B</div>
    <div label="Show / hide" class="button fas ${ICONS.show}">C</div>
    <div label="Collapse / expand" class="button fas ${ICONS.maximize}">D</div>
  </div>
`;

export class TrackPage extends ShadowBaseElement {
  isInitialized: boolean = false;
  onChange: () => void;

  constructor() {
    super(template);
  }

  connectedCallback(): void {}

  initialize() {
    this.isInitialized = true;

    this.onChange();
  }

  setSources(onChange: () => void) {
    this.onChange = onChange;
  }
}

customElements.define("track-page", TrackPage);
