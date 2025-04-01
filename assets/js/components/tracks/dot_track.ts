import { CanvasTrack } from "./canvas_track";
import { renderBorder } from "./render_utils";


export class DotTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(start: number, end: number, dots: DataDot[]) {
        super.syncDimensions();

        const viewNts = end - start;
        const scaleFactor = this._canvas.width / viewNts

        // FIXME: Scaling should be performed before
        // FIXME: Rendering area inside border?
        renderBorder(this._ctx, this._dim);

        const renderDots = dots.map((dot) => {

        })

        renderDots(this._ctx, this._dim, dots, scaleFactor);
    }
}