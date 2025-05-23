import { DataTable } from "simple-datatables";

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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" />
<table id="my-table">
  <thead>
    <tr>
      <th>Case id</th>
      <th>Sample id(s)</th>
      <th>Genome build</th>
      <th>Overview file(s)</th>
      <th>BAM/BAF(s) found</th>
      <th>Import date</th>
    </tr>
  </thead>
  <tbody>
  </tbody>
</table>
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
  private table: HTMLTableElement;
  private dataTable: DataTable;

  connectedCallback(): void {
    this.appendChild(tableTemplate.content.cloneNode(true));

    this.dataTable = new DataTable("#my-table", {
      searchable: true,
      fixedHeight: true,
      perPage: 20,
      labels: { noRows: "Loading..." },
    });
  }

  initialize(
    sampleInfo: SampleInfo[],
    scoutBaseURL: string,
    getGensURL: (caseId: string, sampleIds: string[]) => void,
  ) {
    if (!this.isConnected) {
      throw Error(
        "The component needs to be connected before being initialized",
      );
    }

    const newRows = sampleInfo.map((s) => [
      `<a href="${getGensURL(s.case_id, s.sample_ids)}">${s.case_id}</a> (<a href="${scoutBaseURL}/${s.case_id}">Scout</a>)`,
      s.sample_ids
        .map((id) => `<a href="${getGensURL(s.case_id, [id])}">${id}</a>`)
        .join(", "),
      s.genome_build.toString(),
      s.has_overview_file ? "✓" : "✗",
      s.files_present ? "✓" : "✗",
      prettyDate(s.created_at),
    ]);

    this.dataTable.insert({ data: newRows });
  }
}

customElements.define("samples-table", SamplesTable);
