import tippy, { followCursor } from "tippy.js";
import { drawChromosome } from "../../draw/ideogram";
import { drawRect } from "../../draw/shapes";
import { createChromosomeTooltip } from "../../track/ideogram";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { newDrawRect, renderBands } from "./render_utils";

export class IdeogramTrack extends CanvasTrack {
    private drawPaths: {
        chromosome: { path: Path2D };
        bands: { id: string; path: Path2D }[];
    };

    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);

        const tooltip = createChromosomeTooltip({});
        tippy(this.canvas, {
            arrow: true,
            followCursor: "horizontal",
            content: tooltip,
            plugins: [followCursor],
        });

        this.canvas.addEventListener("mousemove", (event) => {
            if (this.drawPaths === null) {
                return;
            }

            this.drawPaths.bands.forEach((bandPath) => {
                if (
                    this.ctx.isPointInPath(
                        bandPath.path,
                        event.offsetX,
                        event.offsetY,
                    )
                ) {
                    console.log("Inside path");
                    tooltip.querySelector(".ideogram-tooltip-value").innerHTML =
                        bandPath.id;
                }
                // tooltip.querySelector(".ideogram-tooltip-value").innerHTML =
                //   bandPath.id;
            });
        });
    }

    render(chrom: string, chromInfo: ChromosomeInfo, xRange: [number, number]) {
        super.syncDimensions();
        this.drawPaths = cytogeneticIdeogram(
            this.ctx,
            chromInfo,
            this.dimensions,
            xRange,
        );
    }
}

/**
 * Generate a full chromosome ideogram with illustration and tooltip
 */
function cytogeneticIdeogram(
    ctx: CanvasRenderingContext2D,
    chromInfo: ChromosomeInfo,
    dim: Dimensions,
    xRange: [number, number],
): { chromosome: { path: Path2D }; bands: { id: string, path: Path2D }[] } {
    // recalculate genomic coordinates to screen coordinates
    const scale = dim.width / chromInfo.size;
    const centromere =
        chromInfo.centromere !== null
            ? {
                  start: Math.round(chromInfo.centromere.start * scale),
                  end: Math.round(chromInfo.centromere.end * scale),
              }
            : null;

    const stainToColor = STYLE.colors.stainToColor;

    const renderBands = chromInfo.bands.map((band) => {
        return {
            label: band.id,
            start: band.start * scale,
            end: band.end * scale,
            color: stainToColor[band.stain],
        };
    });

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

    // drawPaths.chromosome.chromInfo = {
    //     chrom: chromosomeName,
    //     x: x,
    //     width: width,
    //     scale: scale,
    //     size: chromInfo.size,
    // };
    return drawPaths;
}

customElements.define("ideogram-track", IdeogramTrack);
