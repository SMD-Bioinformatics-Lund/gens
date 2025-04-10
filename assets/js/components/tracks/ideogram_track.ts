import tippy, { followCursor } from "tippy.js";
import { drawChromosome } from "../../draw/ideogram";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track";
import "tippy.js/dist/tippy.css";

interface DrawPaths {
  chromosome: { path: Path2D };
  bands: { id: string; path: Path2D }[];
}

export class IdeogramTrack extends CanvasTrack {
  private drawPaths: DrawPaths = undefined;

  private markerElement: HTMLDivElement;

  private renderData: IdeogramTrackData;
  private getRenderData: () => Promise<IdeogramTrackData>;

  async initialize(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<IdeogramTrackData>,
  ) {
    super.initializeCanvas(label, trackHeight);
    setupTooltip(this.canvas, this.ctx, () => this.drawPaths);

    const markerElement = setupMarkerElement(trackHeight);
    this.trackContainer.appendChild(markerElement);
    this.markerElement = markerElement;

    this.getRenderData = getRenderData;
    await this.getRenderData();
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    super.syncDimensions();

    const { chromInfo, xRange } = this.renderData;

    this.drawPaths = cytogeneticIdeogram(
      this.ctx,
      chromInfo,
      this.dimensions,
    );

    this.renderMarker(xRange, chromInfo.size);
  }

  renderMarker(xRange: [number, number], chromSize: number) {
    // if segment of chromosome is drawn
    const markerElement = this.markerElement;

    const hideMarker = xRange[0] == 1 && xRange[1] == chromSize;
    markerElement.hidden = hideMarker;
    if (!hideMarker) {
      const scale = chromSize / this.dimensions.width;
      const pxStart = xRange[0] / scale;
      const pxWidth = (xRange[1] - xRange[0]) / scale;
      markerElement.style.width = `${pxWidth}px`;
      markerElement.style.marginLeft = `${pxStart}px`;
    }
  }
}

function setupMarkerElement(trackHeight: number): HTMLDivElement {
  const markerElement = document.createElement("div");
  markerElement.id = "ideogram-marker";
  markerElement.className = "marker";

  const leftMargin = STYLE.ideogramMarker.leftMargin;

  markerElement.style.position = "absolute";
  markerElement.style.backgroundColor = STYLE.colors.transparentYellow;

  const bw = STYLE.ideogramMarker.borderWidth;
  markerElement.style.borderLeft = `${bw}px solid ${STYLE.colors.red}`;
  markerElement.style.borderRight = `${bw}px solid ${STYLE.colors.red}`;

  markerElement.style.height = `${trackHeight - bw}px`;
  markerElement.style.width = "0px";
  markerElement.style.top = "0px";
  markerElement.style.marginLeft = `${leftMargin}px`;

  return markerElement;
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
    if (drawPaths === undefined) {
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
      id: band.id,
      label: band.id,
      start: band.start * scale,
      end: band.end * scale,
      color: stainToColor[band.stain],
    };
  });

  const drawPaths = drawChromosome(
    ctx,
    dim,
    centromere,
    STYLE.colors.white,
    renderBands,
  );

  return drawPaths;
}

function createChromosomeTooltip({ bandId: _bandId }: { bandId?: string }) {
  const element = document.createElement("div");
  element.id = "ideogram-tooltip";
  const name = document.createElement("span");
  name.innerHTML = "ID:";
  name.className = "ideogram-tooltip-key";
  element.appendChild(name);
  const value = document.createElement("span");
  value.className = "ideogram-tooltip-value";
  element.appendChild(value);
  return element;
}

customElements.define("ideogram-track", IdeogramTrack);
