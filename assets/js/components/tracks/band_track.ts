import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initializeCanvas(label, trackHeight);
    }

    render(xRange: [number, number], annotations: RenderBand[]) {
        super.syncDimensions();

        const annotWithinRange = annotations.filter(
            (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
        );

        renderBorder(this.ctx, this.dimensions);
        renderBands(this.ctx, this.dimensions, annotWithinRange, xRange);
    }
}

export function test() {}

customElements.define("band-track", BandTrack);
