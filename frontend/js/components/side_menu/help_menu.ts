import { SIZES } from "../../constants";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    #help-container {
      display: flex;
      flex-direction: column;
      gap: ${SIZES.s}px;
      line-height: 1.5;
    }
  </style>
  <div id="help-container">
    <h3>Basic navigation</h3>
    <p>
      This placeholder is intentionally left brief so that detailed instructions can
      be filled in later.
    </p>
    <h3>Mouse navigation</h3>
    <h3>Keyboard shortcuts</h3>
    <h3>Search</h3>
    <p>To search, type your query into the search box. Available queries are</p>
    <ul>
        <li>chromosome:start-stop</li>
        <li>chromosome</li>
        <li>gene name</li>
    </ul>
  </div>
`;

export class HelpMenu extends ShadowBaseElement {
  constructor() {
    super(template);
  }

  render() {}
}

customElements.define("help-page", HelpMenu);
