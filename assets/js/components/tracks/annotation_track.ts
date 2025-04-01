import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class AnnotationTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(start: number, end: number, annotations: TestAnnot[]) {
        super.syncDimensions();

        const viewNts = end - start;
        const scaleFactor = this._canvas.width / viewNts

        // FIXME: Scaling should be performed before
        // FIXME: Rendering area inside border?
        renderBorder(this._ctx, this._dim);
        renderBands(this._ctx, this._dim, annotations, scaleFactor);
    }
}

export function test() {}


customElements.define("annotation-track", AnnotationTrack);
