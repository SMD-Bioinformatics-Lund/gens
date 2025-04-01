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
    annots: { start: number; end: number; color: number[] }[],
    xRange: [number, number],
) {
    console.log(annots);
    annots.forEach((annot) => {
        // console.log(annot);
        const rgbs = annot.color;
        const color = `rgb(${rgbs[0]},${rgbs[1]},${rgbs[2]})`;
        ctx.fillStyle = color;

        const xPxStart = getPixelPosition(annot.start, xRange, canvasDim.width);
        const xPxEnd = getPixelPosition(annot.end, xRange, canvasDim.width);
        ctx.fillRect(xPxStart, 0, xPxEnd - xPxStart, canvasDim.height);
    });
}

function getPixelPosition(pos: number, range: [number, number], viewSize: number): number {
    const viewPos = pos - range[0];
    const scaleFactor = (viewSize) / (range[1] - range[0]);
    const pixelPos = viewPos * scaleFactor;
    return pixelPos;
}

export function renderDots(
    ctx: CanvasRenderingContext2D,
    dots: RenderDot[],
    xRange: [number, number],
    yRange: [number, number],
    canvasDim: { width: number; height: number },
) {
    // console.log("Render dots");

    // const viewNts = xRange[1] - xRange[0]
    // const scaleFactor = pxWidth / viewNts

    dots.forEach((dot) => {
        ctx.fillStyle = dot.color;

        const xPixel = getPixelPosition(dot.pos, xRange, canvasDim.width)
        const yPixel = getPixelPosition(dot.value, yRange, canvasDim.height)

        // const xPos = dot.pos;
        // const xViewPos = xPos - xRange[0];
        // const xScaleFactor = canvasDim.width / dataWidth;
        // const xPixel = xViewPos * xScaleFactor;

        // const yPos = dot.value;
        // // Canvas drawing scale is inverted
        // const yViewPos = dataHeight - (yPos - yRange[0]);
        // const yScaleFactor = canvasDim.height / dataHeight;
        // const yPixel = yViewPos * yScaleFactor;

        // const scaledNt = origX * scaleFactor;
        // const scaledNt = scaledNt(origNt, ntRange)

        const x = 0;
        const y = 0;

        const dotSize = 10;
        ctx.fillRect(
            xPixel - dotSize / 2,
            yPixel - dotSize / 2,
            dotSize,
            dotSize,
        );
    });
}
