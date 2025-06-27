import { SampleInfo, SamplesTable } from "./sample_table";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div class="content">
    <h1>Samples</h1>
    <div class="display-info">
      <label>Institute
        <select id="institute">
          <option value="">All</option>
        </select>
      </label>
    </div>
    <div>
      <samples-table id="samples-table"></samples-table>
    </div>
  </div>
`;

export class GensHome extends HTMLElement {
  private tableElem: SamplesTable;
  private filterSelect: HTMLSelectElement;

  private samples: SampleInfo[];

  initialize(
    samples: SampleInfo[],
    scoutURL: string,
    getGensURL: (caseId: string, sampleIds: string[]) => string,
  ) {
    console.log("Initialize");

    this.tableElem.initialize(samples, scoutURL, getGensURL);

    console.log("samples", this.samples);

    this.samples = samples;

    const institutes = Array.from(
      new Set(
        this.samples.map((s) => s.institute).filter((v): v is string => !!v),
      ),
    ).sort();
    for (const inst of institutes) {
      const opt = document.createElement("option");
      opt.value = inst;
      opt.textContent = inst;
      this.filterSelect.appendChild(opt);
    }
  }

  connectedCallback() {
    console.log("Connected");
    console.log("samples", this.samples);

    this.appendChild(template.content.cloneNode(true));

    this.tableElem = this.querySelector("#samples-table");
    this.filterSelect = this.querySelector("#institute");

    this.filterSelect.addEventListener("change", () => {
      this.tableElem.filterByInstitute(this.filterSelect.value);
    });
  }
}

customElements.define("gens-home", GensHome);
