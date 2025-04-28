import { COLORS, FONT_SIZE, FONT_WEIGHT, PAD } from "../constants";
import { ShadowBaseElement } from "./util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
<style>
  #container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding-left: ${PAD.s}px;
  }
  .row {
    display: flex;
    flex-direction: row;
    padding-top: ${PAD.xs}px;
    justify-content: space-between;
  }
  .text {
    font-size: ${FONT_SIZE.medium}px;
    color: ${COLORS.darkGray};
  }
  .label {
    font-weight: ${FONT_WEIGHT.header};
    padding-right: ${PAD.xs}px;
  }
</style>
<div id="container">
  <div class="row text">
    <div class="label">Case </div>
    <div id="case-id">(value)</div>
  </div>
  <div class="row text">
    <div class="label">Sample </div>
    <div id="sample-ids">(value)</div>
  </div>
</div>
`;

export class HeaderInfo extends ShadowBaseElement {

  private caseIdElem: HTMLDivElement;
  private sampleIdsElem: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    console.log("Connected callhack");
    this.caseIdElem = this.root.querySelector("#case-id") as HTMLDivElement;
    this.sampleIdsElem = this.root.querySelector("#sample-ids") as HTMLDivElement;
  }

  initialize(caseId: string, sampleIds: string[]) {
    console.log("Initialize");
    this.caseIdElem.innerHTML = caseId;
    this.sampleIdsElem.innerHTML = sampleIds.join(", ");
  }
}

customElements.define("header-info", HeaderInfo);
