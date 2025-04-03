import { start } from "repl";
import { drawLine } from "../../draw";
import { drawHorizontalLine, drawVerticalLine } from "../../draw/shapes";
import { transformMap, padRange, rangeSize } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import {
    getPixelPosInRange,
    renderBorder,
    renderDots,
    scaleToPixels,
} from "./render_utils";

function linearScale(pos: number, dataRange: Rng, pxRange: Rng): number {
    const scaleFactor = rangeSize(pxRange) / rangeSize(dataRange);
    // We want non-zero data (-4, +3) to start from zero-coordinate
    const zeroBasedPos = pos - dataRange[0]
    const pxPos = zeroBasedPos * scaleFactor + pxRange[0];
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

        const totalChromSize = Object.values(this.chromSizes).reduce(
            (tot, size) => tot + size,
            0,
        );

        renderBorder(this.ctx, this.dimensions);

        const xScale = (pos: number) => {
            return linearScale(
                pos,
                [0, totalChromSize],
                [0, this.dimensions.width],
            );
        };

        const yScale = (pos: number) => {
            return linearScale(pos, yRange, [0, this.dimensions.height]);
        };

        const chromRanges = getChromRanges(this.chromSizes);
        // Draw the initial lines
        Object.values(chromRanges).forEach(([_chromStart, chromEnd]) =>
            drawVerticalLine(this.ctx, chromEnd, xScale),
        );

        const pxRanges: Record<string, Rng> = transformMap(
            chromRanges,
            ([start, end]) => [xScale(start), xScale(end)],
        );

        Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {

            const pad = 4;
            const pxRange = padRange(pxRanges[chrom], pad);

            const chromXScale = (pos: number) => {
                return linearScale(pos, [0, this.chromSizes[chrom]], pxRange);
            };

            drawDotsScaled(this.ctx, dotData, chromXScale, yScale);

            // FIXME: We should have the data X and Y ranges here
            // Also, we need a render dots where we can select where to render
            // renderDots(this.ctx, dotData, pxXRange, pxYRange, this.dimensions);
            // renderDotsCustom(this.ctx, dotData, pxXRange, xRange, yRange, this.dimensions)
        });
    }
}

function drawDotsScaled(
    ctx: CanvasRenderingContext2D,
    dots: RenderDot[],
    xScale: Scale,
    yScale: Scale,
) {

    const dotSize = 2;
    dots.forEach((dot) => {
        ctx.fillStyle = dot.color;
        const xPixel = xScale(dot.x);
        const yPixel = yScale(dot.y);

        ctx.fillRect(
            xPixel - dotSize / 2,
            yPixel - dotSize / 2,
            dotSize,
            dotSize,
        );
    });
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

function drawSegmentDots(dots: RenderDot[], pxRange: [number, number]) {}

// This will actually be multiple parts
function additionalText() {}

export function test() {}

customElements.define("overview-track", OverviewTrack);
