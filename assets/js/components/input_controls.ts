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

// class RegionController {
//   _chrom: string;
//   _start: number;
//   _end: number;
//   constructor(region: Region) {
//     this._chrom = region.chrom;
//     this._start = region.start;
//     this._end = region.end;
//   }

//   updateRange(range: Rng) {
//     this._start = range[0];
//     this._end = range[1];
//   }

//   getChrom(): string {
//     return this._chrom;
//   }

//   getRange(): Rng {
//     return [this._start, this._end];
//   }

//   getString() {
//     return `${this._chrom}:${this._start}-${this._end}`;
//   }

//   getRegion(): Region {
//     return {
//       chrom: this._chrom,
//       start: this._start,
//       end: this._end,
//     };
//   }
// }

export class InputControls extends HTMLElement {
  private panLeftButton: HTMLButtonElement;
  private panRightButton: HTMLButtonElement;
  private zoomInButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private regionField: HTMLInputElement;
  private removeHighlights: HTMLButtonElement;
  private toggleMarkerButton: HTMLButtonElement;

  // private region: RegionController;
  // private currChromLength: number;

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

  // getRegion(): Region {
  //   return this.region.getRegion();
  // }

  // getRange(): [number, number] {
  //   if (this.regionField.value == null) {
  //     throw Error("Must initialize before accessing getRange");
  //   }
  //   const region = parseRegionDesignation(this.regionField.value);
  //   return [region.start, region.end];
  // }

  // updateChromosome(chrom: string, chromLength: number) {
  //   this.region = new RegionController({ chrom, start: 1, end: chromLength });
  //   this.regionField.value = this.region.getString();
  //   this.currChromLength = chromLength;
  // }

  // updatePosition(range: [number, number]) {
  //   this.region.updateRange(range);
  //   this.regionField.value = this.region.getString();
  // }

  initialize(
    session: GensSession,
    // fullRegion: Region,
    onPositionChange: (newXRange: [number, number]) => void,
    // session: GensSession,
  ) {
    // this.region = new RegionController(fullRegion);
    // this.updatePosition([fullRegion.start, fullRegion.end]);

    // this.session = session;

    this.session = session;

    this.getMarkerOn = () => this.session.getMarkerModeOn();
    this.onToggleMarker = () => this.session.toggleMarkerMode();

    this.onPositionChange = onPositionChange;
    // this.currChromLength = fullRegion.end;

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
    // this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }

  panRight() {
    const currXRange = this.session.getXRange();
    console.log("Pan right start range", currXRange);
    const newXRange = getPan(
      currXRange,
      "right",
      this.session.getCurrentChromSize(),
    );
    console.log("Pan right new range", newXRange);
    // const newMax = Math.min(newXRangeRaw[1], this.currChromLength);
    // const newXRange: Rng = [newXRangeRaw[0], newMax];
    // this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }

  zoomIn() {
    const currXRange = this.session.getXRange();
    const newXRange = zoomIn(currXRange);
    // this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }

  zoomOut() {
    // const currXRange = this.session.getXRange();
    // const newXRangeRaw = zoomOut(currXRange);
    // const newMax = Math.min(newXRangeRaw[1], this.currChromLength);
    // const newXRange: Rng = [Math.floor(newXRangeRaw[0]), Math.floor(newMax)];
    // this.updatePosition(newXRange);
    const newXRange = zoomOut(
      this.session.getXRange(),
      this.session.getCurrentChromSize(),
    );
    this.onPositionChange(newXRange);
  }

  resetZoom() {
    const xRange = [1, this.session.getCurrentChromSize()] as Rng;
    // this.updatePosition(xRange);
    this.onPositionChange(xRange);
  }

  toggleMarkerMode() {
    this.onToggleMarker();
  }
}

customElements.define("input-controls", InputControls);
