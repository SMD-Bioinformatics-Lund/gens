import { drawRect } from "./render_utils";
import { STYLE } from "../constants";

/**
 * Render the actual chromosome
 */
export function drawChromosome(
    ctx: CanvasRenderingContext2D,
    dim: Dimensions,
    centromere: { start: number; end: number },
    color: string,
    bands: RenderBand[],
    xScale: Scale,
    chromShape: Path2D,
) {
    const shiftX = 0;
    const shiftY = 2;
    // const xPadding = 50;
    const yPadding = 5;
    // dim = {
    //     width: dim.width - xPadding,
    //     height: dim.height - yPadding,
    // };
    // const chromPath = {
    //     path: drawChromosomeShape(ctx, shiftX, shiftY, dim, centromere, color),
    // };

    const lineWidth = 1;

    ctx.save();
    ctx.clip(chromShape);
    bands
        .map((band) => {
            const path = drawRect(
                ctx,
                band.start,
                0,
                band.end - band.start,
                dim.height,
                lineWidth,
                band.color,
                band.color,
            );

            const newX = shiftX + band.start;
            const newY = shiftY - yPadding;
            const newWidth = band.end - band.start;
            const newHeight = dim.height + yPadding;
            return {
                id: band.label,
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
                path,
            };
        })
        .filter((band) => {
            if (band.path === null) {
                console.error("Is this ever triggered? A band without a path");
            }
            return band.path !== null;
        });
    ctx.restore();
}

export function getChromosomeShape(
    ctx: CanvasRenderingContext2D,
    pad: {x: number, y: number},
    dim: Dimensions,
    centromere: {start: number, end: number, center: number},
    color: string,
    lineColor: string = STYLE.colors.black,
    xScale: Scale,
    chromSize: number
): Path2D {

    console.log("Getting the shape");

    const {x: xPad, y: yPad} = pad;

    const style = STYLE.ideogramTrack;

    // compute basic measurement
    const bevelWidth = Math.round(dim.width * style.endBevelProportion);

    // calcuate dimensions of the centromere
    const centromereLength = centromere.end - centromere.start;
    const centromereIndent = Math.round(
        dim.height * style.centromereIndentProportion,
    );
    const centromereIndentRadius =
        centromereIndent * 2.5 < centromereLength / 3
            ? Math.round(centromereIndent * 2.5)
            : centromereLength / 3;

    // const centPx = centromere ? {
    //     start: xScale(centromere.start),
    //     end: xScale(centromere.end),
    //     center: xScale((centromere.start + centromere.end) / 2),
    // } : null;

    // const centromereCenter =
    //     centromere.start + Math.round((centromere.end - centromere.start) / 2);

    const chromEndRadius = Math.round((dim.height * 0.7) / 2);

    // path object
    const path = new Path2D();
    // draw shape
    path.moveTo(xScale(0) + bevelWidth, yPad); // move to start
    // path.moveTo(xPad + bevelWidth, yPad); // move to start
    // handle centromere, top indent
    if (centromere) {
        console.log("Making the top indent");
        path.lineTo(centromere.start, yPad);
        // path.lineTo(centromere.start, yPad);
        // indent for centromere
        path.arcTo(
            centromere.center,
            yPad + centromereIndent,
            centromere.end,
            yPad,
            centromereIndentRadius,
        );
        path.lineTo(centromere.end, yPad);
    }
    path.lineTo(xPad + dim.width - bevelWidth + 0.5, yPad + 0.5); // line to end cap
    // path.lineTo(xPad + dim.width - bevelWidth + 0.5, yPad + 0.5); // line to end cap
    // right end cap
    path.arcTo(
        xScale(chromSize),
        yPad,
        xScale(chromSize),
        yPad + dim.height / 2,
        chromEndRadius,
    );
    path.arcTo(
        xScale(chromSize),
        yPad + dim.height,
        xScale(chromSize) - bevelWidth,
        yPad + dim.height,
        chromEndRadius,
    );
    // bottom line
    if (centromere) {
        path.lineTo(centromere.end, yPad + dim.height);
        path.arcTo(
            centromere.center,
            yPad + dim.height - centromereIndent,
            centromere.start,
            yPad + dim.height,
            centromereIndentRadius,
        );
        path.lineTo(centromere.start, yPad + dim.height);
    }
    path.lineTo(xPad + bevelWidth, yPad + dim.height);
    // left end cap
    path.arcTo(xPad, yPad + dim.height, xPad, yPad + dim.height / 2, chromEndRadius);
    path.arcTo(xPad, yPad, xPad + bevelWidth, yPad, chromEndRadius);
    // finish figure
    path.closePath();
    // setup coloring
    ctx.strokeStyle = lineColor;
    ctx.stroke(path);
    if (color !== undefined) {
        ctx.fillStyle = color;
        ctx.fill(path);
    }
    return path;
}
