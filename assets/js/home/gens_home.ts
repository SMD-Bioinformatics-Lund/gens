// import Tabulator from "tabulator-tables";

import { ShadowBaseElement } from "../components/util/shadowbaseelement";
import { removeChildren } from "../util/utils";

import { DataTable } from "simple-datatables";

import {
  ModuleRegistry,
  AllCommunityModule,
  createGrid,
  GridOptions,
  GridApi,
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
<style>
  #table-container {
    width: 1200px;
  }
</style>
<div id="table-container" class="ag-theme-alpine"></div>
`;

export class SamplesTable extends ShadowBaseElement {
  private tableContainer: HTMLDivElement;

  
  // private gridApi: GridApi;
  // private tabulator?: Tabulator;

  constructor() {
    super(tableTemplate);
  }

  connectedCallback(): void {
    super.connectedCallback();

    const tableContainer = this.root.querySelector("#table-container") as HTMLDivElement;

    const dataTable = new DataTable(tableContainer);

    // const gridOptions = {
    //   // Row Data: The data to be displayed.
    //   rowData: [],
    //   // Column Definitions: Defines the columns to be displayed.
    //   columnDefs: [
    //     { field: "make" },
    //     { field: "model" },
    //     { field: "price" },
    //     { field: "electric" },
    //   ],
    //   domLayout: 'autoHeight',
    // };
    // // @ts-ignore
    // this.gridApi = createGrid(this.tableContainer, gridOptions);
    // const rowData = [
    //     {make: 'Toyota', model: 'Celica', price: 35000},
    //     {make: 'Ford', model: 'Mondeo', price: 32000},
    //     {make: 'Porsche', model: 'Boxter', price: 72000}
    // ];
    // // @ts-ignore
    // this.gridApi.setRowData(rowData)
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
