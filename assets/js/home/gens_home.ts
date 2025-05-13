import { ShadowBaseElement } from "../components/util/shadowbaseelement";
import { removeChildren } from "../util/utils";

export interface SampleInfo {
  case_id: string;
  sample_ids: string[];
  genome_build: number;
  has_overview_file: boolean;
  files_present: boolean;
  created_at: string;
}

const tableTemplate = document.createElement("template");
tableTemplate.innerHTML = String.raw`
  <table>
    <thead>
      <tr>
        <td>Case ID</td>
        <td>Sample ID(s)</td>
        <td>Genome build</td>
        <td>Overview file(s)</td>
        <td>Coverage/BAF(s)</td>
        <td>Import date</td>
      </tr>
    </thead>
    <tbody id="body">
      <tr>
        <td>HG002</td>
        <td>1,2,3</td>
        <td>38</td>
        <td>OK</td>
        <td>OK</td>
        <td>Import date</td>
      </tr>
    </tbody>
  </table>
`;

export class SamplesTable extends ShadowBaseElement {
  private bodyElem: HTMLBodyElement;

  constructor() {
    super(tableTemplate);
  }

  connectedCallback(): void {
    console.log("Connecting");
    this.bodyElem = this.root.querySelector("#body");
  }

  initialize(sampleInfo: SampleInfo[]) {
    console.log(this.bodyElem);
    removeChildren(this.bodyElem);

    for (const sample of sampleInfo) {
      const row = document.createElement("tr");

      // case_id: string,
      // sample_ids: string[],
      // genome_build: number,
      // has_overview_file: boolean,
      // files_present: boolean,
      // created_at: string,

      const fields = [
        "case_id",
        "sample_ids",
        "genome_build",
        "has_overview_file",
        "files_present",
        "created_at",
      ];

      for (const field of fields) {
        const cell = document.createElement("td");
        cell.textContent = sample[field];
        row.appendChild(cell);
      }

      this.bodyElem.appendChild(row);
    }
  }
}

customElements.define("samples-table", SamplesTable);

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div class="content">
      <h1>Samples</h1>
      <div>There are <span id="nr-samples">X</span> samples loaded into Gens. Click on a <em>sample_id</em> to open it</div>
  </div>
  <div class="display-info">Displaying 1 to 20 of 3 samples</div>
  <samples-table id="samples-table"></samples-table>
`;

export class GensHome extends HTMLElement {
  private nrSamplesElem: HTMLSpanElement;
  private tableElem: SamplesTable;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.nrSamplesElem = this.querySelector("#nr-samples");
    this.tableElem = this.querySelector("#samples-table");
  }

  initialize(nrSamples: number, samples: SampleInfo[]) {
    this.nrSamplesElem.innerHTML = nrSamples.toString();

    this.tableElem.initialize(samples);

    console.log("Got the samples", samples);
  }
}

customElements.define("gens-home", GensHome);
