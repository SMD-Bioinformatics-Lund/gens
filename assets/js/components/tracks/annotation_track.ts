import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class AnnotationTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(xRange: [number, number], annotations: AnnotationEntry[]) {
        super.syncDimensions();

        const annotWithinRange = annotations.filter(
            (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
        );

        renderBorder(this.ctx, this.dimensions);
        renderBands(this.ctx, this.dimensions, annotWithinRange, xRange);
    }
}

export function test() {}

customElements.define("annotation-track", AnnotationTrack);
