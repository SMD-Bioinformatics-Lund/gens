import { renderBorder } from "./render_utils";

// FIXME: Move somewhere
const PADDING_LEFT = 5;

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container" data-state="nodata" style="padding-left: ${PADDING_LEFT}px; padding-right: ${PADDING_LEFT}">
        <div id='track-container' style="position: relative;">
            <canvas id='canvas'></canvas>
            <!-- <canvas id='canvas-offscreen'></canvas> -->
            <!-- <div id='titles'></div> -->
        </div>
    </div>
`;

export class CanvasTrack extends HTMLElement {
    protected _root: ShadowRoot;
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected dimensions: {width: number, height: number};
    protected _scaleFactor: number;
    protected trackContainer: HTMLDivElement;

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));
    }

    initializeCanvas(label: string, trackHeight: number) {
        // const header = this._root.getElementById("header")
        // header.innerHTML = label;
        this.canvas = this._root.getElementById("canvas") as HTMLCanvasElement;
        // this.canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
        this.canvas.height = trackHeight;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

        this.trackContainer = this._root.getElementById("track-container") as HTMLDivElement;

        this.syncDimensions();

        renderBorder(this.ctx, this.dimensions);
    }

    syncDimensions() {

        if (this.canvas == undefined) {
            console.error("Cannot run syncDimensions before initialize");
        }

        // const viewNts = end - start;

        // FIXME: Not the responsibility of this component
        this.canvas.width = window.innerWidth - PADDING_LEFT;
        this.dimensions = {
            width: this.canvas.width,
            height: this.canvas.height,
        };
    }
}

customElements.define("canvas-track", CanvasTrack);
