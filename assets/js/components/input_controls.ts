import { COLORS, ICONS } from "../constants";
import { GensSession } from "../state/gens_session";
import {
  getPan,
  parseRegionDesignation,
  zoomIn,
  zoomOut,
} from "../util/navigation";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <div id="input-controls-container" style="display: flex; align-items: center; gap: 8px;">
      <button title="Pan left" id="pan-left" class='button pan'>
        <span class="fas ${ICONS.left}"></span>
      </button>
      <button title="Zoom in" id="zoom-in" class='button zoom'>
        <span class="fas ${ICONS.zoomin}"></span>
      </button>
      <button title="Zoom out" id="zoom-out" class='button zoom'>
        <span class="fas ${ICONS.zoomout}"></span>
      </button>
      <button title="Pan right" id="pan-right" class='button pan'>
        <span class="fas ${ICONS.right}"></span>
      </button>
      <input onFocus='this.select();' id='region-field' type='text' class="text-input">
      <button title="Run search" id="submit" class='button pan'>
        <span class="fas ${ICONS.search}"></span>
      </button>
      <button title="Toggle marker mode" id="toggle-marker" class='button pan'>
        <span class="fas ${ICONS.marker}"></span>
      </button>
      <button title="Remove highlights" id="remove-highlights" class='button pan'>
        <span class="fas ${ICONS.xmark}"></span>
      </button>
  </div>
`;

export class InputControls extends HTMLElement {
  private panLeftButton: HTMLButtonElement;
  private panRightButton: HTMLButtonElement;
  private zoomInButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private regionField: HTMLInputElement;
  private removeHighlights: HTMLButtonElement;
  private toggleMarkerButton: HTMLButtonElement;

  private onPositionChange: (newXRange: [number, number]) => void;
  private getMarkerOn: () => boolean;
  private onToggleMarker: () => void;

  private session: GensSession;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.panLeftButton = this.querySelector("#pan-left") as HTMLButtonElement;
    this.panRightButton = this.querySelector("#pan-right") as HTMLButtonElement;
    this.zoomInButton = this.querySelector("#zoom-in") as HTMLButtonElement;
    this.zoomOutButton = this.querySelector("#zoom-out") as HTMLButtonElement;
    this.regionField = this.querySelector("#region-field") as HTMLInputElement;
    this.removeHighlights = this.querySelector(
      "#remove-highlights",
    ) as HTMLButtonElement;
    this.toggleMarkerButton = this.querySelector(
      "#toggle-marker",
    ) as HTMLButtonElement;
  }

  initialize(
    session: GensSession,
    onPositionChange: (newXRange: [number, number]) => void,
  ) {
    this.session = session;

    this.getMarkerOn = () => this.session.getMarkerModeOn();
    this.onToggleMarker = () => this.session.toggleMarkerMode();

    this.onPositionChange = onPositionChange;

    this.panLeftButton.onclick = () => {
      this.panLeft();
    };

    this.panRightButton.onclick = () => {
      this.panRight();
    };

    this.zoomInButton.onclick = () => {
      this.zoomIn();
    };

    this.zoomOutButton.onclick = () => {
      this.zoomOut();
    };

    this.removeHighlights.onclick = () => this.session.removeHighlights();
    this.toggleMarkerButton.onclick = () => this.session.toggleMarkerMode();
  }

  render(_settings: RenderSettings) {
    this.toggleMarkerButton.style.backgroundColor = this.getMarkerOn()
      ? COLORS.lightGray
      : "";

    const region = this.session.getRegion();
    this.regionField.value = `${region.chrom}:${region.start}-${region.end}`;
  }

  panLeft() {
    const currRange = this.session.getXRange();
    const newXRange = getPan(currRange, "left", 1);
    this.onPositionChange(newXRange);
  }

  panRight() {
    const currXRange = this.session.getXRange();
    const newXRange = getPan(
      currXRange,
      "right",
      this.session.getCurrentChromSize(),
    );
    this.onPositionChange(newXRange);
  }

  zoomIn() {
    const currXRange = this.session.getXRange();
    const newXRange = zoomIn(currXRange);
    this.onPositionChange(newXRange);
  }

  zoomOut() {
    const newXRange = zoomOut(
      this.session.getXRange(),
      this.session.getCurrentChromSize(),
    );
    this.onPositionChange(newXRange);
  }

  resetZoom() {
    const xRange = [1, this.session.getCurrentChromSize()] as Rng;
    this.onPositionChange(xRange);
  }

  toggleMarkerMode() {
    this.onToggleMarker();
  }
}

customElements.define("input-controls", InputControls);
