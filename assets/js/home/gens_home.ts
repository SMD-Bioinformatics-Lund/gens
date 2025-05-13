// import Tabulator from "tabulator-tables";

import { ShadowBaseElement } from "../components/util/shadowbaseelement";
import { removeChildren } from "../util/utils";

import {
  ModuleRegistry,
  AllCommunityModule,
  createGrid,
  GridOptions,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export interface SampleInfo {
  case_id: string;
  sample_ids: string[];
  genome_build: number;
  has_overview_file: boolean;
  files_present: boolean;
  created_at: string;
}

const tableBorderColor = "#ddd";
const menubarBgColor = "#4c6d94";
const menubarFontColor = "#f4faff";

const tableTemplate = document.createElement("template");
tableTemplate.innerHTML = String.raw`
<link rel="stylesheet" href="https://unpkg.com/tabulator-tables/dist/css/tabulator.min.css"/>
<div id="table-container" class="ag-theme-alpine"></div>
`;

export class SamplesTable extends ShadowBaseElement {
  private tableContainer: HTMLDivElement;
  // private tabulator?: Tabulator;

  constructor() {
    super(tableTemplate);
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.tableContainer = this.root.querySelector("#table-container");
    const gridOptions = {
      // Row Data: The data to be displayed.
      rowData: [
        { make: "Tesla", model: "Model Y", price: 64950, electric: true },
        { make: "Ford", model: "F-Series", price: 33850, electric: false },
        { make: "Toyota", model: "Corolla", price: 29600, electric: false },
      ],
      // Column Definitions: Defines the columns to be displayed.
      columnDefs: [
        { field: "make" },
        { field: "model" },
        { field: "price" },
        { field: "electric" },
      ],
    };
    // @ts-ignore
    createGrid(this.tableContainer, gridOptions);
  }

  initialize(sampleInfo: SampleInfo[], scoutBaseURL: string) {
    if (!this.isConnected) {
      throw Error(
        "The component needs to be connected before being initialized",
      );
    }

    // if (this.tabulator) {
    //   this.tabulator.replaceData(sampleInfo);
    //   return;
    // }

    console.log("Setting things up with", this.tableContainer);

    // this.tabulator = new Tabulator(this.tableContainer, {
    //   data: sampleInfo,
    //   layout: "fitColumns",
    //   pagination: "local",
    //   paginationSize: 50,
    //   autoResize: false,
    //   placeholder: "No samples found",
    //   columns: [
    //     { title: "Case ID", field: "case_id" },
    //     { title: "Sample ID(s)", field: "sample_ids" },
    //     { title: "Genome build", field: "genome_build" },
    //     { title: "Overview file(s)", field: "has_overview_file" },
    //     { title: "Coverage/BAF(s)", field: "files_present" },
    //     { title: "Import date", field: "created_at" },
    //   ],
    // });
  }

  /* initialize(sampleInfo: SampleInfo[], scoutBaseURL: string) {
    console.log(this.bodyElem);
    removeChildren(this.bodyElem);

    for (const sample of sampleInfo) {
      const row = document.createElement("tr");

      // Case cell
      const caseCell = document.createElement("td");
      const caseLink = document.createElement("a");
      caseLink.innerHTML = `${sample.case_id}`;
      caseLink.href = ""

      const scoutLinkDiv = document.createElement("div");
      const scoutLink = document.createElement("a");
      scoutLink.href = `${scoutBaseURL}/case/case_id/${sample.case_id}`
      scoutLink.innerHTML = "Scout";
      scoutLinkDiv.appendChild(document.createTextNode("("));
      scoutLinkDiv.appendChild(scoutLink);
      scoutLinkDiv.appendChild(document.createTextNode(")"));
      caseCell.appendChild(caseLink);
      caseCell.appendChild(scoutLinkDiv);
      row.appendChild(caseCell);

      // Samples cell
      const samplesCell = document.createElement("td");
      samplesCell.innerHTML = sample.sample_ids.join(", ");
      row.appendChild(samplesCell);

      // Genome build cell
      const genomeBuildCell = document.createElement("td");
      genomeBuildCell.innerHTML = sample.genome_build.toString();
      row.appendChild(genomeBuildCell);

      // Overview file cell
      const overviewCell = document.createElement("td");
      overviewCell.innerHTML = sample.has_overview_file ? "X" : "-";
      row.appendChild(overviewCell);

      // COV/BAF cell
      const covBafCell = document.createElement("td");
      covBafCell.innerHTML = sample.files_present ? "X" : "-";
      row.appendChild(covBafCell);

      // Import date cell
      const importDateCell = document.createElement("td");
      importDateCell.innerHTML = sample.created_at;
      row.appendChild(importDateCell);

      this.bodyElem.appendChild(row);
    }
  } */
}

customElements.define("samples-table", SamplesTable);

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

  initialize(nrSamples: number, samples: SampleInfo[]) {
    this.nrSamplesElem.innerHTML = nrSamples.toString();

    this.tableElem.initialize(samples, "base URL");

    console.log("Got the samples", samples);
  }
}

customElements.define("gens-home", GensHome);
