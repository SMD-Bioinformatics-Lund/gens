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
        // const viewNts = end - start;

        // FIXME: Not the responsibility of this component
        this._canvas.width = window.innerWidth - PADDING;
        this.dimensions = {
            width: this._canvas.width,
            height: this._canvas.height,
        };
        // this._scaleFactor = this._canvas.width / viewNts;
    }

    // render(chrStart: number, chrEnd: number, annotations: TestAnnot[]) {
    //     const canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
    //     // canvas.width = 500;
    //     canvas.height = TRACK_HEIGHT;

    //     // FIXME: Make this responsive
    //     canvas.width = window.innerWidth - PADDING;

    //     const viewNts = chrEnd - chrStart;
    //     const scaleFactor = canvas.width / viewNts;

    //     const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    //     const dim = {
    //         width: canvas.width,
    //         height: canvas.height,
    //     };
    //     this._renderBorder(ctx, dim);
    //     this._renderAnnotations(ctx, dim, annotations, scaleFactor);
    // }

    // private _renderBorder(
    //     ctx: CanvasRenderingContext2D,
    //     canvasDim: { height: number; width: number },
    // ) {
    //     ctx.fillStyle = "white";
    //     ctx.fillRect(0, 0, canvasDim.width, canvasDim.height);
    //     ctx.strokeStyle = "black";
    //     ctx.lineWidth = 2;
    //     ctx.strokeRect(0, 0, canvasDim.width, canvasDim.height);
    // }

    // private _renderAnnotations(
    //     ctx: CanvasRenderingContext2D,
    //     canvasDim: { height: number; width: number },
    //     annots: { start: number; end: number; color: number[] }[],
    //     scaleFactor: number
    // ) {
    //     console.log(annots);
    //     annots.forEach((annot) => {
    //         // console.log(annot);
    //         const rgbs = annot.color;
    //         const color = `rgb(${rgbs[0]},${rgbs[1]},${rgbs[2]})`
    //         ctx.fillStyle = color;
    //         const width = scaleFactor * (annot.end - annot.start);
    //         ctx.fillRect(annot.start * scaleFactor, 0, width, canvasDim.height);
    //     });
    // }
}

customElements.define("canvas-track", CanvasTrack);
