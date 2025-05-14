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
      <icon-button id="goto" icon="${ICONS.right}"></icon-button>
      <icon-button id="remove" icon="${ICONS.xmark}"></icon-button>
    </g-row>
  </g-row>
`;

export class HighlightRow extends ShadowBaseElement {
  private labelElem: HTMLDivElement;
  private gotoElem: HTMLDivElement;
  private removeElem: HTMLDivElement;

  private highlight: RangeHighlight;
  private onGoToHighlight: (region: Region) => void;
  private onRemoveHighlight: (id: string) => void;

  constructor() {
    super(template);
  }

  initialize(
    highlight: RangeHighlight,
    onGoToHighlight: (region: Region) => void,
    onRemoveHighlight: (id: string) => void,
  ) {
    this.highlight = highlight;
    this.onGoToHighlight = onGoToHighlight;
    this.onRemoveHighlight = onRemoveHighlight;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.labelElem = this.root.querySelector("#label");
    this.gotoElem = this.root.querySelector("#goto");
    this.removeElem = this.root.querySelector("#remove");

    const range = this.highlight.range;
    const start = prefixNts(range[0]);
    const end = prefixNts(range[1]);
    const region = {
      chrom: this.highlight.chromosome,
      start: range[0],
      end: range[1],
    }

    this.labelElem.innerHTML = `${this.highlight.chromosome}:${start}-${end}`;
    this.addElementListener(this.gotoElem, "click", () => {
      this.onGoToHighlight(region);
    });

    this.addElementListener(this.removeElem, "click", () => {
      this.onRemoveHighlight(this.highlight.id);
    })
  }
}

customElements.define("highlight-row", HighlightRow);
