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
    h3 {
      margin: 0;
    }
    p {
      margin: 0;
    }
    b {
      font-weight: bold;
    }
  </style>
  <div id="help-container">
    <h3>Mouse navigation</h3>
    <ul>
        <li><b>click</b> and <b>drag</b> with mouse while holding <b>space</b> to move</li>
        <li>Navigate to a chromosome by <b>click</b> in the overview chart (bottom)</li>
        <li>Zoom in by <b>Shift+click</b></li>
        <li>Zoom out by <b>Ctrl+click</b></li>
        <li>Zoom in on a region by <b>Shift</b> and <b>dragging</b> with the mouse</li>
        <li><b>Click</b> chromosome bands in the ideogram chart to jump to that region</li>
        <li>Right click tracks to toggle tracks expanded / collapsed</li>
    </ul>
    <h3>Keyboard shortcuts</h3>
    <ul>
        <li>Use <b>left</b> and <b>right</b> arrow keys to move within a chromosome</li>
        <li>Use <b>up</b> and <b>down</b> keys to zoom in and out</li>
        <li>Use <b>Ctrl + left</b> and <b>right</b> arrow keys to change chromosome</li>
        <li>Press <b>Escape</b> to close the context menu</li>
        <li>Press <b>R</b> to reset the zoom</li>
    </ul>
    <h3>Search</h3>
    <p>To search, type your query into the search box. If multiple entries matches, Gens will navigate to the first. Available queries are:</p>
    <ul>
        <li><b>chromosome:start-stop</b></li>
        <li><b>chromosome</b></li>
        <li><b>gene name</b></li>
        <li><b>matches within any annotation band</b></li>
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
