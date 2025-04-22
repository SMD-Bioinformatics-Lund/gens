import tippy, { followCursor } from "tippy.js";
import { drawChromosome, getChromosomeShape } from "../../draw/ideogram";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track";
import "tippy.js/dist/tippy.css";
import { getLinearScale } from "../../draw/render_utils";

interface DrawPaths {
  chromosome: { path: Path2D };
  bands: { id: string; path: Path2D }[];
}

export class IdeogramTrack extends CanvasTrack {
  // private drawPaths: DrawPaths = undefined;

  private markerElement: HTMLDivElement;

  private renderData: IdeogramTrackData;
  private getRenderData: () => Promise<IdeogramTrackData>;

  constructor(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<IdeogramTrackData>,
  ) {
    super(label, trackHeight);
    this.getRenderData = getRenderData;
  }

  initialize() {
    super.initialize();
    // setupTooltip(this.canvas, this.ctx, () => this.drawPaths);
    const markerElement = setupMarkerElement(this.defaultTrackHeight);
    this.trackContainer.appendChild(markerElement);
    // this.markerElement = markerElement;

    this.initializeInteractive();
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    super.syncDimensions();
    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);

    const { chromInfo, xRange } = this.renderData;

    // const shrinkedDims = {
    //   width: this.dimensions.width - 10,
    //   height: this.dimensions.height
    // }

    const xPadding = 10;

    const xScale = getLinearScale(
      [1, chromInfo.size],
      [xPadding, this.dimensions.width - xPadding],
    );

    let centromere = null;
    if (chromInfo.centromere !== null) {
      console.log("Making the centromere");
      const start = Math.round(xScale(chromInfo.centromere.start));
      const end = Math.round(xScale(chromInfo.centromere.end));
      centromere = {
        start,
        end,
        center: (start + end) / 2
      };
    }

    const stainToColor = STYLE.ideogramTrack.stainToColor;
    const renderBands = chromInfo.bands.map((band) => {
      return {
        id: band.id,
        label: band.id,
        start: xScale(band.start),
        end: xScale(band.end),
        color: stainToColor[band.stain],
      };
    });

    const chromShape = getChromosomeShape(
      this.ctx,
      {x: 10, y: 4},
      this.dimensions,
      centromere,
      "black",
      "black",
      xScale,
      chromInfo.size
    );

    drawChromosome(
      this.ctx,
      this.dimensions,
      centromere,
      STYLE.colors.white,
      renderBands,
      xScale,
      chromShape,
    );

    // const renderBands = cytogeneticIdeogram(
    //   this.ctx,
    //   chromInfo,
    //   this.dimensions,
    //   xScale,
    // );

    // FIXME: Offset - why is it there?
    // FIXME: Style the hover to look like before

    const targets = renderBands.map((band) => {
      return {
        label: band.label,
        box: {
          x1: band.start,
          x2: band.end,
          y1: 0,
          y2: this.dimensions.height,
        },
      };
    });
    this.hoverTargets = targets;

    // this.renderMarker(xRange, this.dimensions.width, xScale);
  }

  // // FIXME: Does not seem to be functional
  // renderMarker(xRange: [number, number], chromSize: number, xScale: Scale) {
  //   // if segment of chromosome is drawn
  //   const markerElement = this.markerElement;

  //   const hideMarker = xRange[0] == 1 && xRange[1] == chromSize;
  //   markerElement.hidden = hideMarker;
  //   if (!hideMarker) {
  //     // const scale = chromSize / renderWidth;
  //     // const pxStart = xRange[0] / scale;
  //     const pxStart = xScale(xRange[0]);
  //     const pxEnd = xScale(xRange[1]);
  //     const pxWidth = pxEnd - pxStart;
  //     markerElement.style.width = `${pxWidth}px`;
  //     markerElement.style.marginLeft = `${pxStart}px`;
  //   }
  // }
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

// function setupTooltip(
//   canvas: HTMLCanvasElement,
//   ctx: CanvasRenderingContext2D,
//   getDrawPaths: () => DrawPaths,
// ) {
//   const tooltip = createChromosomeTooltip({});
//   tippy(canvas, {
//     arrow: true,
//     followCursor: "horizontal",
//     content: tooltip,
//     plugins: [followCursor],
//   });

//   canvas.addEventListener("mousemove", (event) => {
//     const drawPaths = getDrawPaths();
//     if (drawPaths === undefined) {
//       return;
//     }
//     drawPaths.bands.forEach((bandPath) => {
//       const pointInPath = ctx.isPointInPath(
//         bandPath.path,
//         event.offsetX,
//         event.offsetY,
//       );
//       if (pointInPath) {
//         const ideogramClass = ".ideogram-tooltip-value";
//         tooltip.querySelector(ideogramClass).innerHTML = bandPath.id;
//       }
//     });
//   });
// }

// /**
//  * Generate a full chromosome ideogram with illustration and tooltip
//  */
// function cytogeneticIdeogram(
//   ctx: CanvasRenderingContext2D,
//   chromInfo: ChromosomeInfo,
//   dim: Dimensions,
//   xScale: Scale,
// ): RenderBand[] {
//   // recalculate genomic coordinates to screen coordinates
//   const centromere =
//     chromInfo.centromere !== null
//       ? {
//           start: Math.round(xScale(chromInfo.centromere.start)),
//           end: Math.round(xScale(chromInfo.centromere.end)),
//         }
//       : null;

//   // const centromere =
//   // chromInfo.centromere !== null
//   //   ? {
//   //       start: Math.round(chromInfo.centromere.start * scale),
//   //       end: Math.round(chromInfo.centromere.end * scale),
//   //     }
//   //   : null;

//   const stainToColor = STYLE.ideogramTrack.stainToColor;
//   const renderBands = chromInfo.bands.map((band) => {
//     return {
//       id: band.id,
//       label: band.id,
//       start: xScale(band.start),
//       end: xScale(band.end),
//       color: stainToColor[band.stain],
//     };
//   });

//   drawChromosome(ctx, dim, centromere, STYLE.colors.white, renderBands, xScale);

//   return renderBands;
// }

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
