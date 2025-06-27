import { SampleInfo, SamplesTable } from "./sample_table";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div class="content">
    <h1>Samples</h1>
    <div>
      <samples-table id="samples-table"></samples-table>
    </div>
  </div>
`;

export class GensHome extends HTMLElement {
  private tableElem: SamplesTable;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.tableElem = this.querySelector("#samples-table");
  }

  initialize(
    samples: SampleInfo[],
    scoutURL: string,
    getGensURL: (caseId: string, sampleIds: string[]) => string,
  ) {
    this.tableElem.initialize(samples, scoutURL, getGensURL);
  }
}

customElements.define("gens-home", GensHome);
