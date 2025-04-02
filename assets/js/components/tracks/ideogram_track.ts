import { CanvasTrack } from "./canvas_track";
import { renderBorder, renderDots } from "./render_utils";

export class IdeogramTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(
        xRange: [number, number],
        yRange: [number, number],
        dots: RenderDot[],
    ) {
        super.syncDimensions();

        console.log("Rendering");

        // const viewNts = endNt - startNt;
        // const scaleFactor = this._canvas.width / viewNts

        // FIXME: Scaling should be performed before
        // FIXME: Rendering area inside border?
        renderBorder(this.ctx, this.dimensions);

        renderDots(this.ctx, dots, xRange, yRange, this.dimensions);
    }
}

customElements.define("ideogram-track", IdeogramTrack);
