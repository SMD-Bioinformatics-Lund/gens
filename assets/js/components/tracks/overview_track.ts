import { drawLine } from "../../draw";
import { drawVerticalLine } from "../../draw/shapes";
import { CanvasTrack } from "./canvas_track";
import { getPixelRange, scaleToPixels } from "./render_utils";

export class OverviewTrack extends CanvasTrack {
    totalChromSize: number;
    chromSizes: Record<string, number>;

    initialize(
        label: string,
        trackHeight: number,
        chromSizes: Record<string, number>,
    ) {
        super.initializeCanvas(label, trackHeight);
        this.chromSizes = chromSizes;
    }

    // What are the inputs?
    render(
        selectedChrom: string | null,
        dotsPerChrom: Record<string, RenderDot[]>,
    ) {
        super.syncDimensions();

        console.log("Ready for plotting now");

        markRegions(this.ctx, this.chromSizes, this.dimensions.width);

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

function markRegions(
    ctx: CanvasRenderingContext2D,
    chromLengths: Record<string, number>,
    screenWidth: number,
) {

    const totalChromSize = Object.values(chromLengths).reduce(
        (tot, size) => tot + size,
        0,
    );

    let sumPos = 0;
    Object.entries(chromLengths).forEach(([chrom, chromLength]) => {
        sumPos += chromLength;
        const pxPos = scaleToPixels(sumPos, totalChromSize, screenWidth);
        console.log("Rendering at", pxPos);

        drawVerticalLine(ctx, pxPos);
    });
    // Render vertical lines for each chromosome
}

function drawSegmentDots(dots: RenderDot[], pxRange: [number, number]) {}

// This will actually be multiple parts
function additionalText() {}

export function test() {}

customElements.define("overview-track", OverviewTrack);
