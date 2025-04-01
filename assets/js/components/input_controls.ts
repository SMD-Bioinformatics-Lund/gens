import { get } from "../fetch";
import { getPan, parseRegionDesignation, zoomInNew, zoomOutNew } from "../navigation";

const BUTTON_ZOOM_COLOR = "#8fbcbb";
const BUTTON_NAVIGATE_COLOR = "#6db2c5;";
const BUTTON_SUBMIT_COLOR = "#6db2c5;";

const SVG_BASE = "/gens/static/svg";

const template = document.createElement("template");
template.innerHTML = String.raw`
    <!-- <link rel='stylesheet' href='/gens/static/gens.min.css' type='text/css'> -->
    <style>
    .button {
        border: 0px;
        box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.3);
        padding: 5px 15px;
    }
    .zoom {
        background: ${BUTTON_ZOOM_COLOR}
    }
    .pan {
        background: ${BUTTON_NAVIGATE_COLOR}
    }
    #submit {
        background: ${BUTTON_SUBMIT_COLOR}
    }
    .icon {
        background-size: contain;
        display: inline-block;
        width: 16px;
        height: 16px;
    }
    #arrow-left {
        background: url(${SVG_BASE}/arrow-left.svg) no-repeat top left;
    }
    #arrow-right {
        background: url(${SVG_BASE}/arrow-right.svg) no-repeat top left;
    }
    #search-plus {
        background: url(${SVG_BASE}/zoom-in.svg) no-repeat top left;
    }
    #search-minus {
        background: url(${SVG_BASE}/zoom-out.svg) no-repeat top left;
    }
    </style>
    <div style="display: flex; align-items: center; gap: 8px;">
        <select id="source-list"></select>
        <button id="pan-left" class='button pan'>
            <span id="arrow-left" class='icon' title='Left'></span>
        </button>
        <button id="zoom-in" class='button zoom'>
            <span id="search-plus" class='icon' title='Zoom in'></span>
        </button>
        <button id="zoom-out" class='button zoom'>
            <span id="search-minus" class='icon' title='Zoom out'></span>
        </button>
        <button id="pan-right" class='button pan'>
            <span id="arrow-right" class='icon' title='Right'></span>
        </button>
        <div id='region-form'>
            <input onFocus='this.select();' id='region-field' type='text' size=20>
            <input id="submit" type='submit' class='button' title='Submit range'>
        </div>
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

    private fullRegion: Region;

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));

        this.annotationSourceList = this._root.getElementById(
            "source-list",
        ) as HTMLSelectElement;
        this.panLeft = this._root.getElementById(
            "pan-left",
        ) as HTMLButtonElement;
        this.panRight = this._root.getElementById(
            "pan-right",
        ) as HTMLButtonElement;
        this.zoomIn = this._root.getElementById("zoom-in") as HTMLButtonElement;
        this.zoomOut = this._root.getElementById(
            "zoom-out",
        ) as HTMLButtonElement;
        this.regionField = this._root.getElementById(
            "region-field",
        ) as HTMLInputElement;
        this.submit = this._root.getElementById("submit") as HTMLButtonElement;

    }

    getRegion(): Region {
        return parseRegionDesignation(this.regionField.value);
    }

    getSource(): string {
        return this.annotationSourceList.value;
    }

    getRange(): [number, number] {
        const region = parseRegionDesignation(this.regionField.value);
        return [region.start, region.end];
    }

    updatePosition(range: [number, number]) {
        this.regionField.value = `${this.fullRegion.chrom}:${range[0]}-${range[1]}`;
    }

    initialize(
        fullRegion: Region,
        onRegionChanged: (region: Region) => void,
        onAnnotationChanged: (region: Region, source: string) => void,
        onPositionChange: (newXRange: [number, number]) => void
    ) {
        this.fullRegion = fullRegion;
        this.updatePosition([fullRegion.start, fullRegion.end]);
        // this.regionField.value = `${fullRegion.chrom}:${fullRegion.start}-${fullRegion.end}`;

        get("get-annotation-sources", { genome_build: 38 }).then((result) => {
            const filenames = result.sources;
            for (const filename of filenames) {
                const opt = document.createElement("option");
                opt.value = filename;
                opt.innerHTML = filename;
                this.annotationSourceList.appendChild(opt);
            }
        });

        this.annotationSourceList.addEventListener("change", async () => {
            const annotationSource = this.annotationSourceList.value;
            const region = parseRegionDesignation(this.regionField.value);

            onAnnotationChanged(region, annotationSource);
        });

        this.panLeft.onclick = () => {
            const newXRange = getPan(this.getRange(), "left");
            this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newXRange[1]}`;
            onPositionChange(newXRange);
        }

        this.panRight.onclick = () => {
            const newXRange = getPan(this.getRange(), "right");
            this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newXRange[1]}`;
            onPositionChange(newXRange);
        }

        this.zoomIn.onclick = () => {
            const currXRange = this.getRange();
            const newXRange = zoomInNew(currXRange)
            this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newXRange[1]}`;
            onPositionChange(newXRange)
        }

        this.zoomOut.onclick = () => {
            const currXRange = this.getRange();
            const newXRange = zoomOutNew(currXRange)
            // const newMin = newXRange[0];
            const newMax = Math.min(newXRange[1], fullRegion.end);
            this.regionField.value = `${fullRegion.chrom}:${newXRange[0]}-${newMax}`;
            onPositionChange(newXRange)
        }

        this.submit.onclick = () => {
            const range = this.getRange();
            onPositionChange(range);
        }
    }
}

customElements.define("input-controls", InputControls);
