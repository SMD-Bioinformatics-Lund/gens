import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class AnnotationTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(xRange: {start: number, end: number}, annotations: AnnotationEntries[]) {
        super.syncDimensions();

        // const viewNts = xRange.end - xRange.start;
        // const scaleFactor = this._canvas.width / viewNts

        // FIXME: Scaling should be performed before
        // FIXME: Rendering area inside border?
        renderBorder(this.ctx, this.dimensions);
        renderBands(this.ctx, this.dimensions, annotations, [xRange.start, xRange.end]);
    }
}

export function test() {}


customElements.define("annotation-track", AnnotationTrack);
