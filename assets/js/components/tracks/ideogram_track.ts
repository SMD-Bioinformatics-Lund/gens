import tippy, { followCursor } from "tippy.js";
import { drawChromosome } from "../../draw/ideogram";
import { drawRect } from "../../draw/shapes";
import { createChromosomeTooltip } from "../../track/ideogram";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { newDrawRect, renderBands } from "./render_utils";

interface DrawPaths {
    chromosome: { path: Path2D };
    bands: { id: string; path: Path2D }[];
}

export class IdeogramTrack extends CanvasTrack {
    private drawPaths: DrawPaths;

    private markerElement: HTMLDivElement;

    initialize(label: string, trackHeight: number) {
        super.initialize(label, trackHeight);
        setupTooltip(this.canvas, this.ctx, () => this.drawPaths);

        const markerElement = setupMarkerElement(trackHeight);
        this._root.appendChild(markerElement);
        this.markerElement = markerElement;

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

function setupMarkerElement(trackHeight: number): HTMLDivElement {
    const markerElement = document.createElement("div");
    markerElement.id = "ideogram-marker";
    markerElement.className = "marker";
    const x = 5;
    markerElement.style.height = `${trackHeight - 4}px`;
    markerElement.style.width = "0px";
    markerElement.style.top = `-${trackHeight - 4}px`;
    markerElement.style.marginLeft = `${x}px`;
    return markerElement
}

function setupTooltip(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    getDrawPaths: () => DrawPaths,
) {
    const tooltip = createChromosomeTooltip({});
    tippy(canvas, {
        arrow: true,
        followCursor: "horizontal",
        content: tooltip,
        plugins: [followCursor],
    });

    canvas.addEventListener("mousemove", (event) => {
        const drawPaths = getDrawPaths();
        if (drawPaths === null) {
            return;
        }
        drawPaths.bands.forEach((bandPath) => {
            const pointInPath = ctx.isPointInPath(
                bandPath.path,
                event.offsetX,
                event.offsetY,
            );
            if (pointInPath) {
                const ideogramClass = ".ideogram-tooltip-value";
                tooltip.querySelector(ideogramClass).innerHTML = bandPath.id;
            }
        });
    });
}

/**
 * Generate a full chromosome ideogram with illustration and tooltip
 */
function cytogeneticIdeogram(
    ctx: CanvasRenderingContext2D,
    chromInfo: ChromosomeInfo,
    dim: Dimensions,
    xRange: [number, number],
): { chromosome: { path: Path2D }; bands: { id: string; path: Path2D }[] } {
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
