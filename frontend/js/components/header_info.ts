import { COLORS, FONT_SIZE, FONT_WEIGHT, ICONS, SIZES } from "../constants";
import { getCaseLabel } from "../util/utils";
import { ShadowBaseElement } from "./util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
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
  .case-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: ${SIZES.xs}px;
  }
  .linkout-wrapper {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
  }
  .linkout-wrapper[hidden] {
    display: none;
  }
  .linkout-icon {
    font-size: ${FONT_SIZE.medium}px;
    vertical-align: text-middle;
  }
  a {
    color: ${COLORS.white};
  }
</style>
<div id="container">

  <div class="col text">
    <div title="Gens version" class="label" id="version">Version</div>
    <div class="case-row">
      <div title="Case ID" id="case-id">(value)</div>
      <span id="case-linkout-wrapper" class="linkout-wrapper" hidden>
        (
        <a
          id="case-linkout"
          href=""
          target="_blank"
          rel="noopener noreferrer"
          title="Open in external software"
        ><i class="linkout-icon fa-solid ${ICONS.linkout}"></i></a>
        )
      </span>
    </div>
  </div>
</div>
`;

export class HeaderInfo extends ShadowBaseElement {
  private caseIdElem: HTMLDivElement;
  private caseLinkoutElem: HTMLAnchorElement;
  private caseLinkoutWrapperElem: HTMLSpanElement;
  // private sampleIdsElem: HTMLDivElement;
  private versionElem: HTMLDivElement;

  constructor() {
    super(template);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.caseIdElem = this.root.querySelector("#case-id");
    this.caseLinkoutElem = this.root.querySelector("#case-linkout");
    this.caseLinkoutWrapperElem = this.root.querySelector("#case-linkout-wrapper");
    // this.sampleIdsElem = this.root.querySelector("#sample-ids");
    this.versionElem = this.root.querySelector("#version");
  }

  initialize(
    caseId: string,
    displayCaseId: string | null | undefined,
    caseURL: string | null,
    version: string,
  ) {
    this.setCaseLabel(getCaseLabel(caseId, displayCaseId));
    if (caseURL) {
      this.caseLinkoutElem.href = caseURL;
      this.caseLinkoutWrapperElem.hidden = false;
    } else {
      this.caseLinkoutWrapperElem.hidden = true;
      this.caseLinkoutElem.removeAttribute("href");
    }
    this.versionElem.textContent = version;
  }

  setCaseLabel(label: string) {
    this.caseIdElem.textContent = label;
  }
}

customElements.define("header-info", HeaderInfo);
