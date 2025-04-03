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


        // const chromStartPositions = [];
        const pxStartPositions = getPxStartPositions(this.chromSizes, this.dimensions.width);
        
        // Draw the initial lines
        Object.values(pxStartPositions).forEach((pxPos) =>
            drawVerticalLine(this.ctx, pxPos),
        );
    }
}

function getPxStartPositions(
    chromSizes: Record<string, number>,
    screenWidth: number,
): Record<string, number> {

    const totalChromSize = Object.values(chromSizes).reduce(
        (tot, size) => tot + size,
        0,
    );

    const pxStartPositions: Record<string, number> = {};
    let sumPos = 0;
    Object.entries(chromSizes).forEach(([chrom, chromLength]) => {
        sumPos += chromLength;
        const pxPos = scaleToPixels(
            sumPos,
            totalChromSize,
            screenWidth,
        );
        pxStartPositions[chrom] = pxPos;
    });
    return pxStartPositions;
}

function markRegions(
    ctx: CanvasRenderingContext2D,
    pxStartPositions: number[],
) {
    // let sumPos = 0;
    // Object.entries(chromLengths).forEach(([chrom, chromLength]) => {
    //     sumPos += chromLength;
    //     const pxPos = scaleToPixels(sumPos, totalChromSize, screenWidth);
    //     console.log("Rendering at", pxPos);
    //     drawVerticalLine(ctx, pxPos);
    // });
    // Render vertical lines for each chromosome
}

function drawSegmentDots(dots: RenderDot[], pxRange: [number, number]) {}

// This will actually be multiple parts
function additionalText() {}

export function test() {}

customElements.define("overview-track", OverviewTrack);
