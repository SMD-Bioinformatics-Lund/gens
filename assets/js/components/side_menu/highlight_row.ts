import { ICONS } from "../../constants";
import { prefixNts } from "../../util/utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #content-row {
      justify-content: space-between;
      width: 100%;
    }
  </style>
  <g-row id="content-row">
    <div id="label"></div>
    <g-row>
      <icon-button icon="${ICONS.right}"></icon-button>
      <icon-button icon="${ICONS.xmark}"></icon-button>
    </g-row>
  </g-row>
`;

export class HighlightRow extends ShadowBaseElement {
  private labelElem: HTMLDivElement;

  private highlight: RangeHighlight;

  constructor() {
    super(template);
  }

  initialize(highlight: RangeHighlight) {
    this.highlight = highlight;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.labelElem = this.root.querySelector("#label");

    const start = prefixNts(this.highlight.range[0])
    const end = prefixNts(this.highlight.range[1])

    this.labelElem.innerHTML = `${this.highlight.chromosome}:${start}-${end}`;
  }
}

customElements.define("highlight-row", HighlightRow);
