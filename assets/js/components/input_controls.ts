import { get } from "../fetch";
import {
  getPan,
  parseRegionDesignation,
  zoomInNew,
  zoomOutNew,
} from "../navigation";
import { STYLE } from "../util/constants";

// const BUTTON_ZOOM_COLOR = "#8fbcbb";
// const BUTTON_NAVIGATE_COLOR = "#6db2c5;";
// const BUTTON_SUBMIT_COLOR = "#6db2c5;";



const template = document.createElement("template");
template.innerHTML = String.raw`
  <!-- <link rel='stylesheet' href='/gens/static/gens.min.css' type='text/css'> -->
  <style>
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
  .button {
    border: 0px;
    /* box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.3); */
    padding: 8px 20px;
    cursor: pointer;
    background: #FAFBFC;
    border: 1px solid rgba(27, 31, 35, 0.15);
    border-radius: 4px;
    transition: box-shadow 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .button i {
    font-size: 20px;
    line-height: 1;
  }

  /* Add a hover effect to give visual feedback */
  .button:hover {
    background: #E7EEF2;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transform: scale(1.03);
  }

  /* Optional: active effect for when the button is pressed */
  .button:active {
    transform: scale(0.98);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  #container {
    display: "flex";
    align-items: "center";
    gap: "8px";
  }
  #source-list {
    max-height: 100px;
    overflow-y: auto;
    border: 1px solid rgba(27, 31, 35, 0.15);
    border-radius: 4px;
    padding: 4px;
    font-size: 14px;
  }
  </style>
  <div id="container" style="display: flex; align-items: center; gap: 8px;">
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
      <input onFocus='this.select();' id='region-field' type='text' size=20>
      <button id="submit" class='button pan'>
        <i class="fas fa-search"></i>
      </button>
      <select id="source-list" multiple></select>
  </div>
`;

export class InputControls extends HTMLElement {
  private _root: ShadowRoot;

  private annotationSourceList: HTMLSelectElement;
  private panLeft: HTMLButtonElement;
  private panRight: HTMLButtonElement;
  private zoomIn: HTMLButtonElement;
  private zoomOut: HTMLButtonElement;
  private regionField: HTMLInputElement;
  private submit: HTMLButtonElement;

  private region: Region;

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));

    this.annotationSourceList = this._root.getElementById(
      "source-list",
    ) as HTMLSelectElement;
    this.panLeft = this._root.getElementById("pan-left") as HTMLButtonElement;
    this.panRight = this._root.getElementById("pan-right") as HTMLButtonElement;
    this.zoomIn = this._root.getElementById("zoom-in") as HTMLButtonElement;
    this.zoomOut = this._root.getElementById("zoom-out") as HTMLButtonElement;
    this.regionField = this._root.getElementById(
      "region-field",
    ) as HTMLInputElement;
    this.submit = this._root.getElementById("submit") as HTMLButtonElement;
  }

  getRegion(): Region {
    return parseRegionDesignation(this.regionField.value);
  }

  getAnnotSources(): string[] {
    const selected = Array.from(this.annotationSourceList.selectedOptions).map(
      (option) => option.value,
    );
    return selected;
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
    onAnnotationChanged: (region: Region, source: string) => void,
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
      for (const filename of filenames) {
        const opt = document.createElement("option");
        opt.value = filename;
        opt.innerHTML = filename;
        if (defaultAnnots.includes(filename)) {
          opt.selected = true;
        }
        this.annotationSourceList.appendChild(opt);
      }
    });
    // this.annotationSourceList.value = defaultAnnot;

    this.annotationSourceList.addEventListener("change", async () => {
      const annotationSource = this.annotationSourceList.value;
      const region = parseRegionDesignation(this.regionField.value);

      onAnnotationChanged(region, annotationSource);
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
