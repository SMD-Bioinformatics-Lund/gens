import Choices, { InputChoice } from "choices.js";
import {
  getPan,
  parseRegionDesignation,
  zoomInNew,
  zoomOutNew,
} from "../unused/_navigation";
import "choices.js/public/assets/styles/choices.min.css";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    .choices__inner {
      padding: 2px 6px;
      min-height: auto;
    }
    .choices-container {
      max-width: 300px;
    }
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
      <div class="choices-container">
        <select id="source-list" multiple></select>
      </div>
  </div>
`;

export class InputControls extends HTMLElement {
  private annotationSelectElement: HTMLSelectElement;
  private annotationSelectChoices: Choices;

  private panLeft: HTMLButtonElement;
  private panRight: HTMLButtonElement;
  private zoomIn: HTMLButtonElement;
  private zoomOut: HTMLButtonElement;
  private regionField: HTMLInputElement;

  private region: Region;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    this.annotationSelectElement = this.querySelector(
      "#source-list",
    ) as HTMLSelectElement;

    this.annotationSelectChoices = new Choices(this.annotationSelectElement, {
      placeholderValue: "Enter annotation",
      removeItemButton: true,
      itemSelectText: "",
    });

    this.panLeft = this.querySelector("#pan-left") as HTMLButtonElement;
    this.panRight = this.querySelector("#pan-right") as HTMLButtonElement;
    this.zoomIn = this.querySelector("#zoom-in") as HTMLButtonElement;
    this.zoomOut = this.querySelector("#zoom-out") as HTMLButtonElement;
    this.regionField = this.querySelector("#region-field") as HTMLInputElement;

    // Debounce - vänta lite
    this.regionField.addEventListener('change', () => {
      // Vad har Markus skrivit
      // Gör en sökning
      // Uppdatea dropdowngrejer
    })
  }

  getRegion(): Region {
    return this.region;
  }

  getAnnotSources(): string[] {
    return this.annotationSelectChoices.getValue(true) as string[];
  }

  getRange(): [number, number] {
    if (this.regionField.value == null) {
      throw Error("Must initialize before accessing getRange");
    }
    const region = parseRegionDesignation(this.regionField.value);
    return [region.start, region.end];
  }

  updateChromosome(chrom: string, chromLength: number) {
    this.region.chrom = chrom;
    this.region.start = 1;
    this.region.end = chromLength;

    this.regionField.value = `${this.region.chrom}:${this.region.start}-${this.region.end}`;
  }

  updatePosition(range: [number, number]) {
    this.regionField.value = `${this.region.chrom}:${range[0]}-${range[1]}`;
  }

  initialize(
    fullRegion: Region,
    defaultAnnots: string[],
    onAnnotationChanged: (region: Region, sources: string[]) => void,
    onPositionChange: (newXRange: [number, number]) => void,
    annotationSources: ApiAnnotationTrack[],
  ) {
    this.region = fullRegion;
    this.updatePosition([fullRegion.start, fullRegion.end]);

    // FIXME: Move this out from here
    const choices: InputChoice[] = [];
    for (const source of annotationSources) {
      const choice = {
        value: source.track_id,
        label: source.name,
        selected: defaultAnnots.includes(source.name),
      };
      choices.push(choice);
    }
    this.annotationSelectChoices.setChoices(choices);

    this.annotationSelectElement.addEventListener("change", async () => {
      const selectedSources = this.annotationSelectChoices.getValue(
        true,
      ) as string[];
      const region = parseRegionDesignation(this.regionField.value);

      onAnnotationChanged(region, selectedSources);
    });

    this.panLeft.onclick = () => {
      const newXRange = getPan(this.getRange(), "left");
      this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newXRange[1]}`;
      onPositionChange(newXRange);
    };

    this.panRight.onclick = () => {
      const newXRange = getPan(this.getRange(), "right");
      this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newXRange[1]}`;
      onPositionChange(newXRange);
    };

    this.zoomIn.onclick = () => {
      const currXRange = this.getRange();
      const newXRange = zoomInNew(currXRange);
      this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newXRange[1]}`;
      onPositionChange(newXRange);
    };

    this.zoomOut.onclick = () => {
      const currXRange = this.getRange();
      const newXRange = zoomOutNew(currXRange);
      // const newMin = newXRange[0];
      const newMax = Math.min(newXRange[1], fullRegion.end);
      this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newMax}`;
      onPositionChange(newXRange);
    };

    // this.submit.onclick = () => {
    //   const range = this.getRange();
    //   onPositionChange(range);
    // };
  }
}

customElements.define("input-controls", InputControls);
