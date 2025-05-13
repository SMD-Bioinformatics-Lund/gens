// import Tabulator from "tabulator-tables";

import { SampleInfo, SamplesTable } from "./sample_table";



const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div class="content">
    <h1>Samples</h1>
    <div>There are <span id="nr-samples">X</span> samples loaded into Gens. Click on a <em>sample_id</em> to open it</div>
    <div>
      <div class="display-info">Displaying 1 to 20 of 3 samples</div>
      <samples-table id="samples-table"></samples-table>
    </div>
  </div>
`;

export class GensHome extends HTMLElement {
  private nrSamplesElem: HTMLSpanElement;
  private tableElem: SamplesTable;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.nrSamplesElem = this.querySelector("#nr-samples");
    this.tableElem = this.querySelector("#samples-table");
  }

  initialize(
    nrSamples: number,
    samples: SampleInfo[],
    scoutURL: string,
    getGensURL: (caseId: string, sampleIds: string[]) => void,
  ) {
    this.nrSamplesElem.innerHTML = nrSamples.toString();

    this.tableElem.initialize(samples, scoutURL, getGensURL);

    console.log("Got the samples", samples);
  }
}

customElements.define("gens-home", GensHome);
