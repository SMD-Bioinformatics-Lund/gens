const template = document.createElement("template");

template.innerHTML = String.raw`
    <p>Here is a canvas</p>
    <div id="container" class="track-container" data-state="nodata">
        <p class='track-xlabel'></p>
        <div id='track-container' class='info-container' title='{{ track_name }}'>
            <canvas id='canvas' class='info-canvas'></canvas>
            <canvas id='canvas-offscreen' class='info-canvas offscreen'></canvas>
            <div id='titles' class='info-titles'></div>
        </div>
    </div>
`;

export class CanvasTrack extends HTMLElement {
    private _root: ShadowRoot;

    connectedCallback() {
        this._root = this.attachShadow({ mode: "open" });
        this._root.appendChild(template.content.cloneNode(true));

    }

    constructor() {
        super();
    }

    initialize(chrStart: number, chrEnd: number, annotations: TestAnnot[]) {
        console.log("Start");
        const canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
        canvas.width = 500;
        canvas.height = 20;

        const viewNts = chrEnd - chrStart;
        const scaleFactor = canvas.width / viewNts;

        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        const dim = {
            width: canvas.width,
            height: canvas.height,
        };
        this._renderBorder(ctx, dim);
        this._renderAnnotations(ctx, dim, annotations, scaleFactor);
        console.log("Init");   
    }

    private _renderBorder(
        ctx: CanvasRenderingContext2D,
        canvasDim: { height: number; width: number },
    ) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvasDim.width, canvasDim.height);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvasDim.width, canvasDim.height);
    }

    private _renderAnnotations(
        ctx: CanvasRenderingContext2D,
        canvasDim: { height: number; width: number },
        annots: { start: number; end: number; color: string }[],
        scaleFactor: number
    ) {
        annots.forEach((annot) => {
            ctx.fillStyle = annot.color;
            const width = scaleFactor * (annot.end - annot.start);
            ctx.fillRect(annot.start * scaleFactor, 0, width, canvasDim.height);
        });
    }
}

customElements.define("canvas-track", CanvasTrack);
