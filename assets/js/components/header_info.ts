import { COLORS, FONT_SIZE, FONT_WEIGHT, SIZES } from "../constants";
import { ShadowBaseElement } from "./util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
<style>
  #container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding-left: ${SIZES.s}px;
  }
  .row {
    display: flex;
    flex-direction: row;
    padding-top: ${SIZES.xs}px;
    justify-content: space-between;
  }
  .text {
    font-size: ${FONT_SIZE.medium}px;
    color: ${COLORS.darkGray};
  }
  .label {
    font-weight: ${FONT_WEIGHT.header};
    padding-right: ${SIZES.xs}px;
  }
</style>
<div id="container">
  <div class="row text">
    <div class="label">Case </div>
    <a href="" id="case-id">(value)</a>
  </div>
  <div class="row text">
    <div class="label">Sample </div>
    <div id="sample-ids">(value)</div>
  </div>
</div>
`;

export class HeaderInfo extends ShadowBaseElement {
  private caseIdElem: HTMLAnchorElement;
  private sampleIdsElem: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    this.caseIdElem = this.root.querySelector("#case-id");
    this.sampleIdsElem = this.root.querySelector("#sample-ids");
  }

  initialize(
    caseId: string,
    sampleIds: string[],
    caseURL: string,
  ) {
    this.caseIdElem.innerHTML = caseId;
    this.caseIdElem.href = caseURL;
    this.sampleIdsElem.innerHTML = sampleIds.join(", ");
  }
}

customElements.define("header-info", HeaderInfo);
