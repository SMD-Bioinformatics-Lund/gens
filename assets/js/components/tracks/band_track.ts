import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initializeCanvas(label, trackHeight);
        console.log("Initializing band track", label);
    }

    render(xRange: [number, number], annotations: RenderBand[]) {
        const dimensions = super.syncDimensions();
        console.log(`Rendering band track ${this.label} with dim.width: ${dimensions.width}`);

        console.log("Canvas attr width:", this.canvas.width);
        console.log("Canvas style width:", this.canvas.style.width);
        console.log("Canvas clientWidth:", this.canvas.clientWidth);

        console.log("Canvas attr height:", this.canvas.height);
        console.log("Canvas clientHeight:", this.canvas.clientHeight);
        

        const annotWithinRange = annotations.filter(
            (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
        );

        renderBorder(this.ctx, dimensions);
        renderBands(this.ctx, dimensions, annotWithinRange, xRange);
    }
}

export function test() {}

customElements.define("band-track", BandTrack);
