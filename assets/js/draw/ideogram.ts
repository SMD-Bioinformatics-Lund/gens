import { newDrawRect } from "../components/tracks/render_utils";
import { STYLE } from "../util/constants";

/**
 * Render the actual chromosome
 */
export function drawChromosome(
    ctx: CanvasRenderingContext2D,
    dim: Dimensions,
    centromere: { start: number; end: number },
    color: string,
    bands: RenderBand[],
): { chromosome: { path: Path2D }; bands: { id: string, path: Path2D }[] } {
    let shiftX = 5;
    let shiftY = 2;
    dim = {
        width: dim.width - 5,
        height: dim.height - 5,
    };
    const chromPath = {
        path: drawChromosomeShape(ctx, shiftX, shiftY, dim, centromere, color),
    };

    const lineWidth = 1;

    ctx.clip(chromPath.path);
    const bandPaths = bands
        .map((band) => {
            const path = newDrawRect(
                ctx,
                shiftX + band.start,
                shiftY - 5,
                band.end - band.start,
                dim.height + 5,
                lineWidth,
                band.color,
                band.color,
            );

            const newX = shiftX + band.start;
            const newY = shiftY - 5;
            const newWidth = band.end - band.start;
            const newHeight = dim.height + 5;
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
    return { chromosome: chromPath, bands: bandPaths };
}

function drawChromosomeShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dim: Dimensions,
    centromere,
    color: string,
    lineColor: string = STYLE.colors.black,
): Path2D {
    // draw shape of chromosome
    // define proportions of shape
    const endBevelProportion = 0.05;
    const centromereIndentProportion = 0.3;
    // compute basic meassurement
    const bevelWidth = Math.round(dim.width * endBevelProportion);

    // calcuate dimensions of the centromere
    const centromereLength = centromere.end - centromere.start;
    const centromereIndent = Math.round(
        dim.height * centromereIndentProportion,
    );
    const centromereIndentRadius =
        centromereIndent * 2.5 < centromereLength / 3
            ? Math.round(centromereIndent * 2.5)
            : centromereLength / 3;
    const centromereCenter =
        centromere.start + Math.round((centromere.end - centromere.start) / 2);

    const chromEndRadius = Math.round((dim.height * 0.7) / 2);

    // path object
    const path = new Path2D();
    // draw shape
    path.moveTo(x + bevelWidth, y); // move to start
    // handle centromere
    if (centromere) {
        path.lineTo(centromere.start, y);
        // indent for centromere
        path.arcTo(
            centromereCenter,
            y + centromereIndent,
            centromere.end,
            y,
            centromereIndentRadius,
        );
        path.lineTo(centromere.end, y);
    }
    path.lineTo(x + dim.width - bevelWidth + 0.5, y + 0.5); // line to end cap
    // right end cap
    path.arcTo(
        x + dim.width,
        y,
        x + dim.width,
        y + dim.height / 2,
        chromEndRadius,
    );
    path.arcTo(
        x + dim.width,
        y + dim.height,
        x + dim.width - bevelWidth,
        y + dim.height,
        chromEndRadius,
    );
    // bottom line
    if (centromere) {
        path.lineTo(centromere.end, y + dim.height);
        path.arcTo(
            centromereCenter,
            y + dim.height - centromereIndent,
            centromere.start,
            y + dim.height,
            centromereIndentRadius,
        );
        path.lineTo(centromere.start, y + dim.height);
    }
    path.lineTo(x + bevelWidth, y + dim.height);
    // left end cap
    path.arcTo(x, y + dim.height, x, y + dim.height / 2, chromEndRadius);
    path.arcTo(x, y, x + bevelWidth, y, chromEndRadius);
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
