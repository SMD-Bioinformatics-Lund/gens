import { DataTable } from "simple-datatables";

export interface SampleInfo {
  case_id: string;
  sample_ids: string[];
  genome_build: number;
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
        <th>Genome build</th>
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
    this.loadingPlaceholder = this.querySelector("#loading-placeholder");

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
    variantSoftwareUrl: string | null,
    getGensURL: (caseId: string, sampleIds?: string[]) => string,
  ) {
    if (!this.isConnected) {
      throw Error(
        "The component needs to be connected before being initialized",
      );
    }

    this.loadingPlaceholder.hidden = true;
    this.tableContainer.hidden = false;

    // FIXME: URL needs to be generalized when more software are introduced
    const newRows = sampleInfo.map((s) => {
      const gensCaseLink = `<a href="${getGensURL(s.case_id)}">${s.case_id}</a>`;
      const variantSoftwareCaseLink = variantSoftwareUrl
        ? `(<a href="${variantSoftwareUrl}/case/case_id/${s.case_id}" target="_blank" rel="noopener noreferrer">Scout</a>)`
        : "";

      return [
        `${gensCaseLink} ${variantSoftwareCaseLink}`,
        s.sample_ids
          .map((id) => `<a href="${getGensURL(s.case_id, [id])}">${id}</a>`)
          .join(", "),
        s.genome_build.toString(),
        prettyDate(s.created_at),
      ];
    });

    this.dataTable.insert({ data: newRows });
  }
}

customElements.define("samples-table", SamplesTable);
