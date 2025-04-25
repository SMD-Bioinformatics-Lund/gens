import Choices, { EventChoice, InputChoice } from "choices.js";
import "choices.js/public/assets/styles/choices.min.css";
import { getPan, parseRegionDesignation, zoomIn, zoomOut } from "../util/navigation";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    /* .choices__inner {
      padding: 2px 6px;
      min-height: auto;
    } */
    /* .choices-container {
      max-width: 300px;
    } */
  </style>
  <div id="input-controls-container" style="display: flex; align-items: center; gap: 8px;">
      <button id="pan-left" class='button pan'>
        <i class="fas fa-arrow-left"></i>
      </button>
      <button id="zoom-in" class='button zoom'>
        <i class="fas fa-search-plus"></i>
      </button>
      <button id="zoom-out" class='button zoom'>
        <i class="fas fa-search-minus"></i>
      </button>
      <button id="pan-right" class='button pan'>
        <i class="fas fa-arrow-right"></i>
      </button>
      <input onFocus='this.select();' id='region-field' type='text' class="text-input">
      <button id="submit" class='button pan'>
        <i class="fas fa-search"></i>
      </button>
      <!-- <div class="choices-container">
        <select id="source-list" multiple></select>
      </div> -->
  </div>
`;

class RegionController {
  _chrom: string;
  _start: number;
  _end: number;
  constructor(region: Region) {
    this._chrom = region.chrom;
    this._start = region.start;
    this._end = region.end;
  }

  updateRange(range: Rng) {
    this._start = range[0];
    this._end = range[1];
  }

  getChrom(): string {
    return this._chrom;
  }

  getRange(): Rng {
    return [this._start, this._end];
  }

  getString() {
    return `${this._chrom}:${this._start}-${this._end}`;
  }

  getRegion(): Region {
    return {
      chrom: this._chrom,
      start: this._start,
      end: this._end
    }
  }
}

export class InputControls extends HTMLElement {
  private annotationSelectElement: HTMLSelectElement;
  private annotationSelectChoices: Choices;

  private panLeftButton: HTMLButtonElement;
  private panRightButton: HTMLButtonElement;
  private zoomInButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private regionField: HTMLInputElement;

  private region: RegionController;
  private currChromLength: number;

  private onPositionChange: (newXRange: [number, number]) => void;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.annotationSelectElement = this.querySelector(
      "#source-list",
    ) as HTMLSelectElement;

    // this.annotationSelectChoices = new Choices(this.annotationSelectElement, {
    //   placeholderValue: "Enter annotation",
    //   removeItemButton: true,
    //   itemSelectText: "",
    // });

    this.panLeftButton = this.querySelector("#pan-left") as HTMLButtonElement;
    this.panRightButton = this.querySelector("#pan-right") as HTMLButtonElement;
    this.zoomInButton = this.querySelector("#zoom-in") as HTMLButtonElement;
    this.zoomOutButton = this.querySelector("#zoom-out") as HTMLButtonElement;
    this.regionField = this.querySelector("#region-field") as HTMLInputElement;
  }

  getRegion(): Region {
    return this.region.getRegion();
  }

  getAnnotSources(): { id: string; label: string }[] {
    // const selectedObjs =
    //   this.annotationSelectChoices.getValue() as EventChoice[];
    // const returnVals = selectedObjs.map((obj) => {
    //   return {
    //     id: obj.value,
    //     label: obj.label.toString(),
    //   };
    // });
    // return returnVals;
    return [];
  }

  getRange(): [number, number] {
    if (this.regionField.value == null) {
      throw Error("Must initialize before accessing getRange");
    }
    const region = parseRegionDesignation(this.regionField.value);
    return [region.start, region.end];
  }

  updateChromosome(chrom: string, chromLength: number) {
    this.region = new RegionController({chrom, start:1, end: chromLength});
    this.regionField.value = this.region.getString();
    this.currChromLength = chromLength;
  }

  updatePosition(range: [number, number]) {
    this.region.updateRange(range);
    this.regionField.value = this.region.getString();
  }

  initialize(
    fullRegion: Region,
    defaultAnnots: string[],
    onAnnotationChanged: (region: Region, sources: string[]) => void,
    onPositionChange: (newXRange: [number, number]) => void,
    annotationSources: ApiAnnotationTrack[],
  ) {
    this.region = new RegionController(fullRegion);
    this.updatePosition([fullRegion.start, fullRegion.end]);
    this.onPositionChange = onPositionChange;
    this.currChromLength = fullRegion.end;

    // // FIXME: Move this out from here
    // const choices: InputChoice[] = [];
    // for (const source of annotationSources) {
    //   const choice = {
    //     value: source.track_id,
    //     label: source.name,
    //     selected: defaultAnnots.includes(source.name),
    //   };
    //   choices.push(choice);
    // }
    // this.annotationSelectChoices.setChoices(choices);

    // this.annotationSelectElement.addEventListener("change", async () => {
    //   const selectedSources = this.annotationSelectChoices.getValue(
    //     true,
    //   ) as string[];
    //   const region = parseRegionDesignation(this.regionField.value);

    //   onAnnotationChanged(region, selectedSources);
    // });

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
  }

  panLeft() {
    const newXRange = getPan(this.getRange(), "left");
    this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }

  panRight() {
    const newXRangeRaw = getPan(this.getRange(), "right");
    const newMax = Math.min(newXRangeRaw[1], this.currChromLength);
    const newXRange: Rng = [newXRangeRaw[0], newMax];
    this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }

  zoomIn() {
    const currXRange = this.getRange();
    const newXRange = zoomIn(currXRange);
    this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }

  zoomOut() {
    const currXRange = this.getRange();
    const newXRangeRaw = zoomOut(currXRange);
    const newMax = Math.min(newXRangeRaw[1], this.currChromLength);
    const newXRange: Rng = [newXRangeRaw[0], newMax];
    this.updatePosition(newXRange);
    this.onPositionChange(newXRange);
  }
}

customElements.define("input-controls", InputControls);
