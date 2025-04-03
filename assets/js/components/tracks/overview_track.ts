import { drawLine } from "../../draw";
import { drawHorizontalLine, drawVerticalLine } from "../../draw/shapes";
import { padRange, rangeSize } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import {
    getPixelPosInRange,
    renderBorder,
    renderDots,
    scaleToPixels,
} from "./render_utils";

function linearScale(pos: number, dataRange: Rng, pxRange: Rng): number {
    const scaleFactor = rangeSize(pxRange) / rangeSize(dataRange)
    const pxPos = pos * scaleFactor + pxRange[0];
    return pxPos;
}

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
        yRange: [number, number],
    ) {
        super.syncDimensions();

        // const xScale = (pos: number) => {
        //     const xPixel = getPixelPosInRange(dot.x, xRange, pxWidth) + paddedPxXRange[0];

        // }

        const totalChromSize = Object.values(this.chromSizes).reduce(
            (tot, size) => tot + size,
            0,
        );
    

        renderBorder(this.ctx, this.dimensions);

        const xScale = (pos: number) => {
            return linearScale(pos, [0, totalChromSize], [0, this.dimensions.width])
        }

        const chromRanges = getChromRanges(this.chromSizes);
        // Draw the initial lines
        Object.values(chromRanges).forEach(([_chromStart, chromEnd]) =>
            drawVerticalLine(this.ctx, chromEnd, xScale),
        );

        // drawHorizontalLine(this.ctx, -1);
        // drawHorizontalLine(this.ctx, 0);
        // drawHorizontalLine(this.ctx, 1);
        // drawHorizontalLine(this.ctx, 0.5);

        // Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {
        //     const pxXRange = pxRanges[chrom];
        //     // const pxYRange: [number, number] = [0, this.dimensions.height];

        //     const xRange: Rng = [0, this.chromSizes[chrom]];

        //     // FIXME: We should have the data X and Y ranges here
        //     // Also, we need a render dots where we can select where to render
        //     // renderDots(this.ctx, dotData, pxXRange, pxYRange, this.dimensions);
        //     // renderDotsCustom(this.ctx, dotData, pxXRange, xRange, yRange, this.dimensions)
        // });
    }
}

function renderDotsCustom(
    ctx: CanvasRenderingContext2D,
    dots: RenderDot[],
    pxXRange: Rng,
    xRange: Rng,
    yRange: Rng,
    dim: Dimensions
) {
    const pad = 2;
    const paddedPxXRange = padRange(pxXRange, pad);

    const pxWidth = rangeSize(paddedPxXRange);

    const dotSize = 2;
    dots.forEach((dot) => {
        ctx.fillStyle = dot.color;
        // Scale and shift to the correct window
        const xPixel = getPixelPosInRange(dot.x, xRange, pxWidth) + paddedPxXRange[0];
        const yPixel = getPixelPosInRange(dot.y, yRange, dim.height)
        ctx.fillRect(xPixel - dotSize / 2, yPixel - dotSize / 2, dotSize, dotSize)
    })
}

function getChromRanges(
    chromSizes: Record<string, number>,
): Record<string, [number, number]> {

    const chromRanges: Record<string, [number, number]> = {};
    let sumPos = 0;
    Object.entries(chromSizes).forEach(([chrom, chromLength]) => {
        const startPos = sumPos;
        sumPos += chromLength;

        const posRange: Rng = [startPos, sumPos];
        // const pxRange = posRange.map((pos) =>
        //     scaleToPixels(pos, totalChromSize, screenWidth),
        // ) as [number, number];

        chromRanges[chrom] = posRange;
    });
    return chromRanges;
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
