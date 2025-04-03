import { CanvasTrack } from "./canvas_track";

export class OverviewTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    // What are the inputs?
    render(selectedChrom: string|null, dotsPerChrom: Record<string, RenderDot[]>) {
        super.syncDimensions();

        console.log("Ready for plotting now");

        // This is the key function
        // get-multiple-coverages
        // results: { 1: { baf: [] } }

        // get-overview-chrom-dim, not needed or?

        // const annotWithinRange = annotations.filter(
        //     (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
        // );

        // renderBorder(this.ctx, this.dimensions);
        // renderBands(this.ctx, this.dimensions, annotWithinRange, xRange);
    }
}

function markRegions(chromLengths: number[], xDim: number) {
    // Render vertical lines for each chromosome
}

function drawSegmentDots(dots: RenderDot[], pxRange: [number, number]) {}

// This will actually be multiple parts
function additionalText() {}

export function test() {}

customElements.define("overview-track", OverviewTrack);
