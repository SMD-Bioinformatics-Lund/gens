import { ShadowBaseElement } from "../components/util/shadowbaseelement";

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
    <tbody>
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
  constructor() {
    super(tableTemplate);
  }
}

customElements.define("samples-table", SamplesTable);


const template = document.createElement("template");
template.innerHTML = String.raw`
  <style></style>
  <div class="content">
      <h1>Samples</h1>
      <div>There are X samples loaded into Gens. Click on a <em>sample_id</em> to open it</div>
  </div>
  <div class="display-info">Displaying 1 to 20 of 3 samples</div>
  <samples-table></samples-table>
`;

export class GensHome extends HTMLElement {

    connectedCallback() {
        this.appendChild(template.content.cloneNode(true));
    }
}

customElements.define("gens-home", GensHome);
