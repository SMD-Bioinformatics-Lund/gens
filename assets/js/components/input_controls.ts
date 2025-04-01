const BUTTON_ZOOM_COLOR = "#8fbcbb";
const BUTTON_NAVIGATE_COLOR = "#6db2c5;"

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
            <input type='submit' class='button button--submit no-print' title='Submit range'>
        </form>
    </div>
`;

export class InputControls extends HTMLElement {
    private _root: ShadowRoot;

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));
    }

    initialize() {

    }
}

customElements.define("input-controls", InputControls);
