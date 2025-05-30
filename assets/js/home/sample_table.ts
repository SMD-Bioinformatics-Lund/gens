// import { DataTable } from "simple-datatables";

import DataTable from "datatables.net-dt";
import { AjaxResponse } from "datatables.net-dt";

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
<style>
  .wide-cell {
    min-width: 100px;
  }
</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" />
<link rel="stylesheet" href="https://cdn.datatables.net/2.3.1/css/dataTables.dataTables.min.css" />
<table id="my-table">
  <thead>
    <tr>
      <th>Case id</th>
      <th>Sample id(s)</th>
      <th>Genome build</th>
      <th>Overview file(s)</th>
      <th>BAM/BAF(s) found</th>
      <th class="wide-cell">Import date</th>
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

interface DTData {
  start: number;
  length: number;
  search: { value?: string };
  order?: { column: number; dir: string }[];
  draw: boolean;
}

export class SamplesTable extends HTMLElement {
  private table: HTMLTableElement;
  private dataTable: any;

  private sampleInfo: SampleInfo[];
  private getGensURL: (caseId: string, sampleIds: string[]) => string;
  private scoutBaseURL: string;

  connectedCallback(): void {
    this.appendChild(tableTemplate.content.cloneNode(true));

    this.dataTable = new DataTable("#my-table", {
      data: [],
      serverSide: true,
      processing: true,
      deferRender: true,
      paging: true,
      pageLength: 50,
      autoWidth: false,
      searching: true,
      ordering: true,
      info: true,
      lengthChange: false,
      language: { emptyTable: "Loading..." },
      ajax: (dtParams: DTData, callback: (settings: string) => void) => {
        return this.servePage(dtParams, callback);
      },
      columns: [
        {
          data: "case_id",
          render: (cid: string, _: any, row: SampleInfo) =>
            `<a href="${this.getGensURL(row.case_id, row.sample_ids)}">${row.case_id}</a> (<a href="${this.scoutBaseURL}/${row.case_id}">Scout</a>)`,
        },
        {
          data: "sample_ids",
          render: (cid: string, _: any, row: SampleInfo) =>
            row.sample_ids
              .map(
                (id) =>
                  `<a href="${this.getGensURL(row.case_id, [id])}">${id}</a>`,
              )
              .join(", "),
        },
        {
          data: "genome_build",
        },
        {
          data: "has_overview_file",
          render: (f: boolean) => (f ? "✓" : "✗"),
        },
        {
          data: "files_present",
          render: (f: boolean) => (f ? "✓" : "✗"),
        },
        {
          data: "created_at",
          render: (iso: string) => prettyDate(iso),
          className: "wide-cell",
        },
      ],
    });
  }

  // new DataTables(this.table)({
  //   searchable: true,
  //   fixedHeight: true,
  //   perPage: 20,
  //   labels: { noRows: "Loading..." },
  // });

  // this.dataTable = new DataTable("#my-table", {
  //   searchable: true,
  //   fixedHeight: true,
  //   perPage: 20,
  //   labels: { noRows: "Loading..." },
  // });

  private servePage(dtParams: DTData, callback: (data: any) => void) {

    if (this.sampleInfo == null) {
      return;
    }

    const { start, length, search, order } = dtParams;
    let data = this.sampleInfo;

    if (search.value) {
      const term = search.value.toLowerCase();
      data = data.filter(
        (r) =>
          r.case_id.toLowerCase().includes(term) ||
          r.sample_ids.some((s) => s.toLowerCase().includes(term)),
      );
    }

    if (order.length) {
      const colIdx = order[0].column;
      const dir = order[0].dir === "asc" ? 1 : -1;
      const key = [
        "case_id",
        "sample_ids",
        "genome_build",
        "has_overview_file",
        "files_present",
        "created_at",
      ][colIdx];
      data = data
        .slice()
        .sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
    }

    const pageData = data.slice(start, start + length);

    callback({
      draw: dtParams.draw,
      recordsTotal: this.sampleInfo.length,
      recordsFiltered: data.length,
      data: pageData,
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
    this.sampleInfo = sampleInfo;
    this.getGensURL = getGensURL;
    this.scoutBaseURL = scoutBaseURL;

    this.dataTable.ajax.reload();

    // const rows = sampleInfo.map((s) => [
    //   `<a href="${getGensURL(s.case_id, s.sample_ids)}">${s.case_id}</a> (<a href="${scoutBaseURL}/${s.case_id}">Scout</a>)`,
    //   s.sample_ids
    //     .map((id) => `<a href="${getGensURL(s.case_id, [id])}">${id}</a>`)
    //     .join(", "),
    //   s.genome_build.toString(),
    //   s.has_overview_file ? "✓" : "✗",
    //   s.files_present ? "✓" : "✗",
    //   prettyDate(s.created_at),
    // ]);

    // this.dataTable.clear();
    // this.dataTable.rows.add(rows);
    // this.dataTable.draw();

    // this.dataTable.insert({ data: newRows });
  }
}

customElements.define("samples-table", SamplesTable);
