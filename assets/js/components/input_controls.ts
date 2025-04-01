import { get } from "../fetch";
import { parseRegionDesignation } from "../navigation";

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
        <form id='region-form'>
            <input onFocus='this.select();' id='region-field' type='text' size=20>
            <input id="submit" type='submit' class='button' title='Submit range'>
        </form>
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
    }

    initialize(
        startRegion: { chr: string; start: number; end: number },
        render: (region: Region, annotation: string) => void,
    ) {

        this.regionField.value = `${startRegion.chr}:${startRegion.start}-${startRegion.end}`;

        get("get-annotation-sources", { genome_build: 38 }).then((result) => {
            const filenames = result.sources;
            for (const filename of filenames) {
                const opt = document.createElement("option");
                opt.value = filename;
                opt.innerHTML = filename;
                this.annotationSourceList.appendChild(opt);
            }
        });

        let annotationData = [];
        this.annotationSourceList.addEventListener("change", async () => {
            const annotationSource = this.annotationSourceList.value;
            const region = parseRegionDesignation(this.regionField.value);
            const payload = {
                sample_id: undefined,
                region: `${region.chrom}:${region.start}-${region.end}`,
                genome_build: 38,
                collapsed: true,
                source: annotationSource,
            };

            render(region, annotationSource);
            // const annotsResult = await get("get-annotation-data", payload);
            // annotationTrack.render(
            //     region.start,
            //     region.end,
            //     annotsResult.annotations,
            // );
        });

        this.regionField.addEventListener("change", () => {
            const region = parseRegionDesignation(this.regionField.value);
            console.log(region);
            const annotationSource = this.annotationSourceList.value;
            render(region, annotationSource);
        });
    }
}

customElements.define("input-controls", InputControls);
