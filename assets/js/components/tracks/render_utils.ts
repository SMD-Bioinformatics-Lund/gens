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
    canvasDim: { height: number; width: number },
    annots: RenderBand[],
    xRange: [number, number],
) {
    annots.forEach((annot) => {
        // const rgbs = annot.color;
        // const color = `rgb(${rgbs[0]},${rgbs[1]},${rgbs[2]})`;
        ctx.fillStyle = annot.color;

        const xPxStart = getPixelPosInRange(
            annot.start,
            xRange,
            canvasDim.width,
        );
        const xPxEnd = getPixelPosInRange(annot.end, xRange, canvasDim.width);
        ctx.fillRect(xPxStart, 0, xPxEnd - xPxStart, canvasDim.height);
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
