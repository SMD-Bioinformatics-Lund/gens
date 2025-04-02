import { drawRect } from "../../draw/shapes";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { newDrawRect, renderBands } from "./render_utils";

export class IdeogramTrack extends CanvasTrack {
    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
    }

    render(
        chrom: string,
        chromInfo: ChromosomeInfo,
        xRange: [number, number],
    ) {
        super.syncDimensions();

        // const annotWithinRange = annotations.filter(
        //     (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
        // );

        cytogeneticIdeogram(
            this.ctx,
            chrom,
            chromInfo,
            this.dimensions,
            xRange,
        );

        // renderBorder(this.ctx, this.dimensions);
        // renderBands(this.ctx, this.dimensions, annotWithinRange, xRange);
    }
}

/**
 * Generate a full chromosome ideogram with illustration and tooltip
 */
function cytogeneticIdeogram(
    ctx: CanvasRenderingContext2D,
    chromosomeName: string,
    chromInfo: ChromosomeInfo,
    dim: Dimensions,
    xRange: [number, number],
) {
    // recalculate genomic coordinates to screen coordinates
    const scale = dim.width / chromInfo.size;
    const centromere =
        chromInfo.centromere !== null
            ? {
                  start: Math.round(chromInfo.centromere.start * scale),
                  end: Math.round(chromInfo.centromere.end * scale),
              }
            : null;
    // const x = 3;

    const stainToColor = STYLE.colors.stainToColor;

    const renderBands = chromInfo.bands.map((band) => {
        return {
            start: band.start * scale,
            end: band.end * scale,
            color: stainToColor[band.stain],
        }
    })



    const y = 5;
    // const width = width - 5;
    // const height = height - 6;
    const drawPaths = drawChromosome(
        ctx,
        dim,
        centromere,
        STYLE.colors.white,
        renderBands,
    );
    //   drawPaths.chromosome.chromInfo = {
    //     chrom: chromosomeName,
    //     x: x,
    //     width: width,
    //     scale: scale,
    //     size: chromInfo.size,
    //   };
    //   return drawPaths;
}

/**
 * Render the actual chromosome
 */
function drawChromosome(
    ctx: CanvasRenderingContext2D,
    dim: Dimensions,
    centromere: any,
    color: string,
    bands: RenderBand[],
) {
    let x = 0;
    let y = 0;
    const chromPath = {
        path: drawChromosomeShape(ctx, x, y, dim, centromere, color),
    };

    console.log("Draw chromosome");

    const lineWidth = 1;

    ctx.clip(chromPath.path);
    const bandPaths = bands
        .map((band) => {
            const path = newDrawRect(
                ctx,
                x + band.start,
                y - 5,
                band.end - band.start,
                dim.height + 5,
                lineWidth,
                band.color,
                band.color,
            );

            const newX = x + band.start;
            const newY = y - 5;
            const newWidth = band.end - band.start;
            const newHeight = dim.height + 5;
            return {
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

    // cacluate dimensions of the centromere
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
    path.lineTo(x + dim.width - bevelWidth, y); // line to end cap
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

customElements.define("ideogram-track", IdeogramTrack);
