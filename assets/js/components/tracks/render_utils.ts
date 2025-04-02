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
    console.log(annots);
    annots.forEach((annot) => {
        // console.log(annot);
        // const rgbs = annot.color;
        // const color = `rgb(${rgbs[0]},${rgbs[1]},${rgbs[2]})`;
        ctx.fillStyle = annot.color;

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
    dotSize: number = 4
) {
    dots.forEach((dot) => {
        ctx.fillStyle = dot.color;
        const xPixel = getPixelPosition(dot.x, xRange, canvasDim.width)
        const yPixel = getPixelPosition(dot.y, yRange, canvasDim.height)
        ctx.fillRect(
            xPixel - dotSize / 2,
            yPixel - dotSize / 2,
            dotSize,
            dotSize,
        );
    });
}
