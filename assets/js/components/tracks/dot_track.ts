import { CanvasTrack } from "./canvas_track";
import { drawDotsScaled, linearScale, renderBorder, renderDots } from "./render_utils";

export class DotTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initializeCanvas(label, trackHeight);
    }

    render(
        xRange: [number, number],
        yRange: [number, number],
        dots: RenderDot[],
    ) {
        super.syncDimensions();

        const xScale = this.getScale(xRange, "x");
        const yScale = this.getScale(yRange, "y");

        renderBorder(this.ctx, this.dimensions);
        drawDotsScaled(this.ctx, dots, xScale, yScale);
    }
}

customElements.define("dot-track", DotTrack);
