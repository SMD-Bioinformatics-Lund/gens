import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class AnnotationTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(range: {start: number, end: number}, annotations: TestAnnot[]) {
        super.syncDimensions();

        const viewNts = range.end - range.start;
        const scaleFactor = this._canvas.width / viewNts

        // FIXME: Scaling should be performed before
        // FIXME: Rendering area inside border?
        renderBorder(this.ctx, this.dimensions);
        renderBands(this.ctx, this.dimensions, annotations, scaleFactor);
    }
}

export function test() {}


customElements.define("annotation-track", AnnotationTrack);
