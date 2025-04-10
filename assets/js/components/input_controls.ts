import Choices, { InputChoice } from "choices.js";
import { get } from "../fetch";
import {
  getPan,
  parseRegionDesignation,
  zoomInNew,
  zoomOutNew,
} from "../navigation";
import 'choices.js/public/assets/styles/choices.min.css';

// import "choices.js/public/assets/styles/choices.css";

const template = document.createElement("template");
template.innerHTML = String.raw`
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
      <select id="source-list" multiple></select>
      <!-- <tag-multi-select id="annotation-pill-select"></tag-multi-select> -->
  </div>
`;

export class InputControls extends HTMLElement {
  private annotationSourceList: Choices;
  
  // private annotationSelect: TagMultiSelect;

  private panLeft: HTMLButtonElement;
  private panRight: HTMLButtonElement;
  private zoomIn: HTMLButtonElement;
  private zoomOut: HTMLButtonElement;
  private regionField: HTMLInputElement;

  private region: Region;

  connectedCallback() {
    this.appendChild(template.content.cloneNode(true));

    const sourceList = this.querySelector(
      "#source-list",
    ) as HTMLSelectElement;

    this.annotationSourceList = new Choices(sourceList, {
      placeholderValue: "Enter annotation",
      removeItemButton: true,
      itemSelectText: "",
    });

    this.panLeft = this.querySelector("#pan-left") as HTMLButtonElement;
    this.panRight = this.querySelector("#pan-right") as HTMLButtonElement;
    this.zoomIn = this.querySelector("#zoom-in") as HTMLButtonElement;
    this.zoomOut = this.querySelector("#zoom-out") as HTMLButtonElement;
    this.regionField = this.querySelector("#region-field") as HTMLInputElement;

    // this.annotationSelect = this.querySelector(
    //   "#annotation-pill-select",
    // ) as TagMultiSelect;

    // const annotations = ["BRCA1", "TP53", "EGFR"];
    // this.annotationPillSelect.setOptions(annotations)
    // this.annotationPillSelect.setSelected([annotations[1]]);
  }

  getRegion(): Region {
    return this.region;
    // return parseRegionDesignation(this.regionField.value);
  }

  getAnnotSources(): string[] {
    return ["Placeholders", "A", "B"]
    // return this.annotationSourceList.value;
    // return this.annotationSelect.getSelected();
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
    apiURL: string,
  ) {
    this.region = fullRegion;
    this.updatePosition([fullRegion.start, fullRegion.end]);
    // this.regionField.value = `${fullRegion.chrom}:${fullRegion.start}-${fullRegion.end}`;

    // FIXME: Move this out from here
    get(new URL("get-annotation-sources", apiURL).href, {
      genome_build: 38,
    }).then((result) => {
      const filenames = result.sources;
      const choices: InputChoice[] = [];
      for (const filename of filenames) {
        const choice = {value: filename, label: filename}
        // const opt = document.createElement("option");
        // opt.value = filename;
        // opt.innerHTML = filename;
        // if (defaultAnnots.includes(filename)) {
        //   opt.selected = true;
        // }
        // console.log("Appending source:", opt);
        // this.annotationSourceList.appendChild(opt);

        // const annotations = ["BRCA1", "TP53", "EGFR"];
        choices.push(choice);
      }
      this.annotationSourceList.setChoices(choices, 'value', 'label', false);

      // this.annotationSelect.setOptions(filenames)
      // fIXME: Verify that these are within the filenames
      // this.annotationSelect.setSelected(defaultAnnots);
    });
    // this.annotationSourceList.value = defaultAnnot;

    // this.annotationSourceList.addEventListener("change", async () => {
    //   console.log("Change ")
    //   const selectedSources = [this.annotationSourceList.value];
    //   // const selectedSources = this.annotationSourceList.getSelected();
    //   const region = parseRegionDesignation(this.regionField.value);

    //   onAnnotationChanged(region, selectedSources);
    // });

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
