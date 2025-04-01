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
    scaleFactor: number
) {
    console.log(annots);
    annots.forEach((annot) => {
        // console.log(annot);
        const rgbs = annot.color;
        const color = `rgb(${rgbs[0]},${rgbs[1]},${rgbs[2]})`
        ctx.fillStyle = color;
        const width = scaleFactor * (annot.end - annot.start);
        ctx.fillRect(annot.start * scaleFactor, 0, width, canvasDim.height);
    });
}

// What is the responsibility here?
// Given data and viewport, render
export function renderDots(ctx: CanvasRenderingContext2D, dots: RenderDot[]) {
    dots.forEach((dot) => {
        ctx.fillStyle = dot.color;
        const width = 1;
        const height = 1;
        ctx.fillRect(dot.x, dot.y, width, height);
    });
}