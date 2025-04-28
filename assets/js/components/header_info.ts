import { COLORS, FONT_SIZE, PAD } from "../constants";
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
  }
  .text {
    font-size: ${FONT_SIZE.medium}px;
    color: ${COLORS.darkGray};
  }
</style>
<div id="container">
  <div class="row text">
    <div>Case: </div>
    <div id="case-id">(value)</div>
  </div>
  <div class="row text">
    <div>Sample: </div>
    <div id="sample-ids">(value)</div>
  </div>
</div>
`;

export class HeaderInfo extends ShadowBaseElement {

  private caseId: HTMLDivElement;
  private sampleIds: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    this.root.querySelector("case-id") as HTMLDivElement;
    this.root.querySelector("sample-ids") as HTMLDivElement;
  }

  initialize(caseId: string, sampleIds: string[]) {
    this.caseId.innerHTML = "Case initialized to " + caseId;
    this.sampleIds.innerHTML = "Sample IDs initialized to " + sampleIds.join(", ");
  }
}

customElements.define("header-info", HeaderInfo);
