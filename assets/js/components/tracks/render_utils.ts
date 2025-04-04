import { rangeSize } from "../../track/utils";

export function renderBorder(
    ctx: CanvasRenderingContext2D,
    canvasDim: { height: number; width: number },
) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasDim.width, canvasDim.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasDim.width, canvasDim.height);
}

export function renderBands(
    ctx: CanvasRenderingContext2D,
    // canvasDim: { height: number; width: number },
    annots: RenderBand[],
    xScale: Scale,
) {
    annots.forEach((band) => {
        ctx.fillStyle = band.color;
        const xPxStart = xScale(band.start);
        const xPxEnd = xScale(band.end);
        ctx.fillStyle = band.color;
        const width = xPxEnd - xPxStart
        const height = band.y2 - band.y1
        ctx.fillRect(xPxStart, band.y1, width, height);
    });
}

export function scaleToPixels(
    dataPos: number,
    dataSize: number,
    viewSize: number,
) {
    const scaleFactor = viewSize / dataSize;
    const pixelPos = dataPos * scaleFactor;
    return pixelPos;
}

export function getPixelPosInRange(
    pos: number,
    range: [number, number],
    viewSize: number,
): number {
    const viewPos = pos - range[0];
    const scaleFactor = viewSize / (range[1] - range[0]);
    const pixelPos = viewPos * scaleFactor;
    return pixelPos;
}

// FIXME: Think through this
// In particular the getPixelPosInRange
// Does it make sense?
export function renderDots(
    ctx: CanvasRenderingContext2D,
    dots: RenderDot[],
    xRange: [number, number],
    yRange: [number, number],
    canvasDim: { width: number; height: number },
    dotSize: number = 4,
) {
    dots.forEach((dot) => {
        ctx.fillStyle = dot.color;
        const xPixel = getPixelPosInRange(dot.x, xRange, canvasDim.width);
        const yPixel = getPixelPosInRange(dot.y, yRange, canvasDim.height);
        ctx.fillRect(
            xPixel - dotSize / 2,
            yPixel - dotSize / 2,
            dotSize,
            dotSize,
        );
    });
}

export function newDrawRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth: number,
    color: string = null,
    fillColor: string = null,
    open: boolean = false,
) {
    x = Math.floor(x) + 0.5;
    y = Math.floor(y) + 0.5;
    width = Math.floor(width);

    if (color !== null) ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    // define path to draw
    const path = new Path2D();

    // Draw box without left part, to allow stacking boxes
    // horizontally without getting double lines between them.
    if (open === true) {
        path.moveTo(x, y);
        path.lineTo(x + width, y);
        path.lineTo(x + width, y + height);
        path.lineTo(x, y + height);
        // Draw normal 4-sided box
    } else {
        path.rect(x, y, width, height);
    }
    ctx.stroke(path);
    if (fillColor !== null) {
        ctx.fillStyle = fillColor;
        ctx.fill(path);
    }
    return path;
}

export function linearScale(pos: number, dataRange: Rng, pxRange: Rng): number {
    const scaleFactor = rangeSize(pxRange) / rangeSize(dataRange);
    // We want non-zero data (-4, +3) to start from zero-coordinate
    const zeroBasedPos = pos - dataRange[0];
    const pxPos = zeroBasedPos * scaleFactor + pxRange[0];
    return pxPos;
}


export function drawDotsScaled(
    ctx: CanvasRenderingContext2D,
    dots: RenderDot[],
    xScale: Scale,
    yScale: Scale,
    dotSize: number = 2,
) {
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