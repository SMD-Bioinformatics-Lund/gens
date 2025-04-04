import {
  createTooltipElement,
  makeVirtualDOMElement,
} from "../../track/tooltip";
import { stringToHash } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder, scaleToPixels } from "./render_utils";

type RenderObj = {
  id: string;
  name: string;
  start: number;
  end: number;
  pxX1: number;
  pxX2: number;
  pxY1: number;
  pxY2: number;
  features: [];
  isDisplayed: boolean;
  tooltip?: any;
};

export class BandTrack extends CanvasTrack {

  initialize(label: string, trackHeight: number) {
    super.initializeCanvas(label, trackHeight);
    console.log("Initializing band track", label);
    this.initializeTooltip();
  }

  render(xRange: [number, number], annotations: RenderBand[]) {
    const dimensions = super.syncDimensions();

    const annotWithinRange = annotations.filter(
      (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
    );

    // Hover
    const xScale = this.getScale(xRange, "x");

    this.hoverTargets = annotations.map((band) => {
      return {
        label: band.label,
        x1: xScale(band.start),
        x2: xScale(band.end),
        y1: 0,
        y2: this.dimensions.height
      }
    })

    renderBorder(this.ctx, dimensions);
    renderBands(this.ctx, dimensions, annotWithinRange, xRange);

    // this.renderTooltip(annotWithinRange, xScale, this.dimensions);
  }

  // renderTooltip(bands: RenderBand[], xScale: Scale, dim: Dimensions) {
  //   const tooltip = createTooltipElement({
  //     id: "popover-${annotationObj.id}",
  //     title: "annotationObj.name",
  //     information: [
  //       { title: "More info", value: "Value" },
  //       // { title: track.chrom, value: `${track.start}-${track.end}` },
  //       // { title: "Score", value: `${track.score}` },
  //     ],
  //   });
  //   this.trackContainer.appendChild(tooltip);

  //   for (const band of bands) {
  //     const renderObj = makeRenderObj(band, xScale, dim);

  //     const virtualElement = makeVirtualDOMElement({
  //       x1: renderObj.pxX1,
  //       x2: renderObj.pxX1,
  //       y1: renderObj.pxY1,
  //       y2: renderObj.pxY2,
  //       canvas: this.canvas,
  //     });

  //     renderObj.tooltip = {
  //       instance: createPopper(virtualElement, tooltip, {
  //         modifiers: [
  //           {
  //             name: "offset",
  //             options: {
  //               offset: [0, virtualElement.getBoundingClientRect().height],
  //             },
  //           },
  //         ],
  //       }),
  //       virtualElement: virtualElement,
  //       tooltip: tooltip,
  //       isDisplayed: false,
  //     }
  //   }
  // }
}

function makeRenderObj(
  band: RenderBand,
  xScale: Scale,
  dim: Dimensions,
): RenderObj {
  return {
    id: stringToHash(
      `${band.label}-${band.start}-${band.end}-${band.color}`,
    ).toString(),
    name: band.label ?? "no name",
    start: band.start,
    end: band.end,
    pxX1: xScale(band.start),
    pxX2: xScale(band.end),
    pxY1: 0,
    pxY2: dim.height,
    features: [],
    isDisplayed: true,
  };
}

customElements.define("band-track", BandTrack);
