import { COLORS, FONT_WEIGHT, SIZES } from "../../constants";
import { removeChildren } from "../../util/utils";
import { getEntry } from "../util/menu_utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    .header {
      font-weight: ${FONT_WEIGHT.header};
      margin-top: ${SIZES.m}px;
      margin-bottom: ${SIZES.xs}px;
    }
    #entries {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.xs}px;
    }
    .sub-header {
      font-weight: ${FONT_WEIGHT.bold};
      margin-top: ${SIZES.xs}px;
    }
    table.meta-table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: ${SIZES.s}px;
      font-size: 12px;
    }
    table.meta-table th,
    table.meta-table td {
      border: 1px solid ${COLORS.lightGray};
      padding: ${SIZES.xxs}px ${SIZES.xs}px;
      text-align: left;
    }
    table.meta-table th {
      background: ${COLORS.extraLightGray};
      font-weight: ${FONT_WEIGHT.header};
    }
  </style>
  <div id="entries"></div>
`;

export class InfoMenu extends ShadowBaseElement {
  private entries!: HTMLDivElement;
  private getSamples!: () => Sample[];

  constructor() {
    super(template);
  }

  // FIXME: Look over this. Can this be a general utility?
  private createTable(meta: SampleMetaEntry): HTMLDivElement {
    const container = document.createElement("div");
    const header = document.createElement("div");
    header.className = "sub-header";
    header.textContent = meta.file_name;
    container.appendChild(header);

    const data = meta.data.filter(
      (d) => d.row_name != null,
    ) as (SampleMetaValue & { row_name: string })[];
    const types = Array.from(new Set(data.map((d) => d.type)));
    const rows = Array.from(new Set(data.map((d) => d.row_name)));

    const table = document.createElement("table");
    table.className = "meta-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const empty = document.createElement("th");
    headRow.appendChild(empty);
    for (const t of types) {
      const th = document.createElement("th");
      th.textContent = t;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const r of rows) {
      const row = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.textContent = r;
      row.appendChild(nameTd);
      for (const t of types) {
        const td = document.createElement("td");
        const entry = data.find((d) => d.row_name === r && d.type === t);
        if (entry) {
          td.textContent = entry.value;
          if (entry.color) {
            td.style.color = entry.color;
          }
        }
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    container.appendChild(table);
    return container;
  }

  setSources(getSamples: () => Sample[]) {
    this.getSamples = getSamples;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.entries = this.root.querySelector("#entries");
  }

  render() {
    if (!this.isConnected) {
      return;
    }
    removeChildren(this.entries);
    const samples = this.getSamples ? this.getSamples() : [];

    console.log(samples);

    for (const sample of samples) {
      const header = document.createElement("div");
      header.className = "header";
      header.textContent = sample.sampleId;
      this.entries.appendChild(header);

      this.entries.appendChild(
        getEntry({ key: "Case ID", value: sample.caseId }),
      );
      if (sample.sampleType) {
        this.entries.appendChild(
          getEntry({ key: "Sample type", value: sample.sampleType }),
        );
      }
      // Optional fields
      const sex = sample.sex;
      if (sex != null) {
        this.entries.appendChild(getEntry({ key: "Sex", value: sex }));
      }
      const metas = sample.meta;
      if (metas != null && Array.isArray(metas)) {
        for (const meta of metas) {
          const hasRowName = meta.data.every((d) => d.row_name != null);

          if (hasRowName) {
            this.entries.appendChild(this.createTable(meta));
          } else {
            for (const entry of meta.data) {
              if (entry.row_name == null) {
                this.entries.appendChild(
                  getEntry({
                    key: entry.type,
                    value: entry.value,
                    color: entry.color,
                  }),
                );
              }
            }
          }
        }
      }
    }
  }
}

customElements.define("info-page", InfoMenu);
