import { DataTable } from "simple-datatables";

export interface SampleInfo {
  case_id: string;
  sample_ids: string[];
  institute: string | null;
  genome_build: number;
  has_overview_file: boolean;
  files_present: boolean;
  created_at: string;
}

const tableTemplate = document.createElement("template");
tableTemplate.innerHTML = String.raw`
<style>
  .wide-cell {
    min-width: 100px;
  }
</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" />
<div id="loading-placeholder">Loading ...</div>
<div id="table-container" hidden>
  <table id="table-content">
    <thead>
      <tr>
        <th>Case id</th>
        <th>Sample id(s)</th>
        <th>Institute
        <th>Genome build</th>
        <th>Overview file(s)</th>
        <th>BAM/BAF(s) found</th>
        <th class="wide-cell">Import date</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
</div>
`;

function prettyDate(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  return `${Y}-${M}-${D} ${h}:${m}`;
}

export class SamplesTable extends HTMLElement {
  private dataTable: DataTable;
  private tableContainer: HTMLDivElement;
  private loadingPlaceholder: HTMLDivElement;

  connectedCallback(): void {
    this.appendChild(tableTemplate.content.cloneNode(true));

    this.tableContainer = this.querySelector("#table-container");
    this.loadingPlaceholder = this.querySelector(
      "#loading-placeholder",
    );

    this.dataTable = new DataTable("#table-content", {
      searchable: true,
      fixedHeight: true,
      perPage: 50,
      perPageSelect: false,
      labels: { noRows: "No samples found" },
    });
  }

  initialize(
    sampleInfo: SampleInfo[],
    scoutBaseURL: string,
    getGensURL: (caseId: string, sampleIds: string[]) => string,
  ) {
    if (!this.isConnected) {
      throw Error(
        "The component needs to be connected before being initialized",
      );
    }

    this.loadingPlaceholder.hidden = true;
    this.tableContainer.hidden = false;

    const newRows = sampleInfo.map((s) => [
      `<a href="${getGensURL(s.case_id, s.sample_ids)}">${s.case_id}</a> (<a href="${scoutBaseURL}/${s.case_id}">Scout</a>)`,
      s.sample_ids
        .map((id) => `<a href="${getGensURL(s.case_id, [id])}">${id}</a>`)
        .join(", "),
      s.institute || "-",
      s.genome_build.toString(),
      s.has_overview_file ? "✓" : "✗",
      s.files_present ? "✓" : "✗",
      prettyDate(s.created_at),
    ]);

    this.dataTable.insert({ data: newRows });
  }
}

customElements.define("samples-table", SamplesTable);
