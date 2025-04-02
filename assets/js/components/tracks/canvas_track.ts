import { renderBorder } from "./render_utils";

const TRACK_HEIGHT = 20;
const PADDING = 5;

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container" data-state="nodata" style="padding-left: ${PADDING}px">
        <p class='track-xlabel'></p>
        <div id='track-container'>
            <div id="header"></div>
            <canvas id='canvas'></canvas>
            <!-- <canvas id='canvas-offscreen'></canvas> -->
            <!-- <div id='titles'></div> -->
        </div>
    </div>
`;

export class CanvasTrack extends HTMLElement {
    protected _root: ShadowRoot;
    protected _canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected dimensions: {width: number, height: number};
    protected _scaleFactor: number;

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));
    }

    initialize(label: string, trackHeight: number) {
        const header = this._root.getElementById("header")
        header.innerHTML = label;
        this._canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
        this._canvas.height = trackHeight;
        this.ctx = this._canvas.getContext("2d") as CanvasRenderingContext2D;

        this.syncDimensions();

        renderBorder(this.ctx, this.dimensions);
    }

    syncDimensions() {

        if (this._canvas == undefined) {
            console.error("Cannot run syncDimensions before initialize");
        }

        // const viewNts = end - start;

        // FIXME: Not the responsibility of this component
        this._canvas.width = window.innerWidth - PADDING;
        this.dimensions = {
            width: this._canvas.width,
            height: this._canvas.height,
        };
    }
}

customElements.define("canvas-track", CanvasTrack);
