import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class AnnotationTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(xRange: [number, number], annotations: AnnotationEntries[]) {
        super.syncDimensions();

        renderBorder(this.ctx, this.dimensions);
        renderBands(this.ctx, this.dimensions, annotations, xRange);
    }
}

export function test() {}


customElements.define("annotation-track", AnnotationTrack);
