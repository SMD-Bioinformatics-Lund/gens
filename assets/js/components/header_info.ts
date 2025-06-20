import { COLORS, FONT_SIZE, FONT_WEIGHT, SIZES } from "../constants";
import { ShadowBaseElement } from "./util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
<style>
  #container {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
    padding-left: ${SIZES.s}px;
  }
  .row {
    display: flex;
    flex-direction: row;
    padding-top: ${SIZES.xs}px;
    justify-content: space-between;
  }
  .col {
    display: flex;
    flex-direction: column;
  }
  .text {
    font-size: ${FONT_SIZE.large}px;
    color: ${COLORS.white};
  }
  .label {
    font-weight: ${FONT_WEIGHT.header};
    padding-right: ${SIZES.xs}px;
  }
  a {
    color: ${COLORS.white}
  }
</style>
<div id="container">

  <div class="col text">
    <div title="Gens version" class="label" id="version">Version</div>
    <a title="Case ID" href="" id="case-id" target="_blank">(value)</a>
  </div>
</div>
`;

export class HeaderInfo extends ShadowBaseElement {
  private caseIdElem: HTMLAnchorElement;
  // private sampleIdsElem: HTMLDivElement;
  private versionElem: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.caseIdElem = this.root.querySelector("#case-id");
    // this.sampleIdsElem = this.root.querySelector("#sample-ids");
    this.versionElem = this.root.querySelector("#version");
  }

  initialize(
    caseId: string,
    caseURL: string,
    version: string,
  ) {
    this.caseIdElem.innerHTML = caseId;
    this.caseIdElem.href = caseURL;
    this.versionElem.innerHTML = version;
  }
}

customElements.define("header-info", HeaderInfo);
