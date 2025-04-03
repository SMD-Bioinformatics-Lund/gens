import { drawLine } from "../../draw";
import { drawVerticalLine } from "../../draw/shapes";
import { CanvasTrack } from "./canvas_track";
import {
    getPixelPosInRange,
    renderBorder,
    renderDots,
    scaleToPixels,
} from "./render_utils";

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

        renderBorder(this.ctx, this.dimensions);

        const pxRanges = getPxRanges(this.chromSizes, this.dimensions.width);
        // Draw the initial lines
        Object.values(pxRanges).forEach(([_pxStart, pxEnd]) =>
            drawVerticalLine(this.ctx, pxEnd),
        );

        Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {
            const pxXRange = pxRanges[chrom];
            const pxYRange: [number, number] = [0, this.dimensions.height];
            console.log("Rendering dots");

            // FIXME: We should have the data X and Y ranges here
            // Also, we need a render dots where we can select where to render
            renderDots(this.ctx, dotData, pxXRange, pxYRange, this.dimensions)
        });
    }
}

function getPxRanges(
    chromSizes: Record<string, number>,
    screenWidth: number,
): Record<string, [number, number]> {
    const totalChromSize = Object.values(chromSizes).reduce(
        (tot, size) => tot + size,
        0,
    );

    const pxStartPositions: Record<string, [number, number]> = {};
    let sumPos = 0;
    Object.entries(chromSizes).forEach(([chrom, chromLength]) => {
        const startPos = sumPos;
        sumPos += chromLength;

        const posRange = [startPos, sumPos];
        const pxRange = posRange.map((pos) =>
            scaleToPixels(pos, totalChromSize, screenWidth),
        ) as [number, number];

        pxStartPositions[chrom] = pxRange;
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
