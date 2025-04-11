import { getOverlapInfo, getTrackHeight } from "../../util/expand_track_utils";
import { getBandYScale } from "../../util/utils";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track";
import {
  drawArrow,
  getLinearScale,
  renderBackground,
} from "../../draw/render_utils";
import { drawLabel } from "../../draw/shapes";
import { createPopper } from "@popperjs/core";
import { computePosition, autoUpdate } from "@floating-ui/dom";
import { GensPopup } from "../util/popup";

function createPopup(
  canvas: HTMLCanvasElement,
  hoveredTarget: HoverBox,
  getPopupContent: (band: RenderElement) => string,
) {
  const popup = document.createElement("gens-popup") as GensPopup;
  popup.setContent(getPopupContent(hoveredTarget.element));
  document.body.appendChild(popup);

  const virtualReference = {
    getBoundingClientRect: () => {
      const canvasRect = canvas.getBoundingClientRect();
      const x = canvasRect.left + hoveredTarget.box.x1;
      const y = canvasRect.top + hoveredTarget.box.y1;

      return {
        top: y,
        left: x,
        bottom: y,
        right: x,
        width: 0,
        height: 0,
        x: x,
        y: y,
        toJSON: () => {},
      };
    },
    contextElement: canvas,
  };

  const update = () => {
    computePosition(virtualReference, popup, {
      placement: "top",
      middleware: [],
    }).then(({ x, y}) => {
      Object.assign(popup.style, {
        left: `${x}px`, top: `${y}px`, position: "absolute",
      });
    });
  };

  const cleanup = autoUpdate(virtualReference, popup, update);

  popup.addEventListener("close", () => {
    cleanup();
    popup.remove();
  });

  update();
}

export class BandTrack extends CanvasTrack {
  renderData: BandTrackData | null;
  getRenderData: () => Promise<BandTrackData>;
  // onBandClick: (band: RenderBand) => void | null = null;

  async initialize(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<BandTrackData>,
    getPopupInfo: (band: RenderBand) => string,
  ) {
    const onElementClick = (box: HoverBox) => {
      // const popupInfo = getPopupInfo(box.element as RenderBand);
      createPopup(this.canvas, box, getPopupInfo);
    };

    super.initializeCanvas(label, trackHeight);
    this.initializeInteractive(onElementClick);
    this.initializeExpander(trackHeight);
    this.getRenderData = getRenderData;
  }

  async render(updateData: boolean) {
    if (this.getRenderData == undefined) {
      throw Error(`No getRenderData set up for track, must initialize first`);
    }

    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    const { bands, xRange } = this.renderData;
    const ntsPerPx = this.getNtsPerPixel(xRange);
    const showDetails = ntsPerPx < STYLE.tracks.zoomLevel.showDetails;
    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    const { numberLanes, bandOverlaps } = getOverlapInfo(bands);

    const labelSize =
      this.isExpanded() && showDetails ? STYLE.tracks.textLaneSize : 0;

    this.setExpandedTrackHeight(numberLanes, showDetails);
    const dimensions = super.syncDimensions();

    const yScale = getBandYScale(
      STYLE.bandTrack.trackPadding,
      STYLE.bandTrack.bandPadding,
      this.isExpanded() ? numberLanes : 1,
      this.dimensions.height,
      labelSize,
    );

    const renderBand: RenderBand[] = bands.map((band) => {
      if (bandOverlaps[band.id] == null) {
        throw Error(`Missing ID: ${band.id}`);
      }
      const bandNOverlap = bandOverlaps[band.id].lane;
      const yRange = yScale(bandNOverlap, this.isExpanded());

      const renderBand = Object.create(band);
      renderBand.y1 = yRange[0];
      renderBand.y2 = yRange[1];
      renderBand.edgeColor = STYLE.bandTrack.edgeColor;

      return renderBand;
    });

    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const hoverTargets = renderBand.flatMap((band) => {
      const bandHoverTargets = drawBand(
        this.ctx,
        band,
        xScale,
        showDetails,
        this.isExpanded(),
      );
      return bandHoverTargets;
    });

    // getHoverTargets(renderBand, xScale, (band) => band.hoverInfo),
    this.setHoverTargets(hoverTargets);
    this.drawTrackLabel();
  }

  setExpandedTrackHeight(numberLanes: number, showDetails: boolean) {
    const style = STYLE.bandTrack;
    const expandedHeight = getTrackHeight(
      style.trackHeight.thin,
      numberLanes,
      style.trackPadding,
      style.bandPadding,
      showDetails,
    );
    super.setExpandedHeight(expandedHeight);
  }
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  band: RenderBand,
  xScale: (number) => number,
  showDetails: boolean,
  isExpanded: boolean,
): HoverBox[] {
  const y1 = band.y1;
  const y2 = band.y2;
  const height = y2 - y1;

  const hoverBoxes: HoverBox[] = [];

  // Body
  const xPxRange: Rng = [xScale(band.start), xScale(band.end)];
  const [xPxStart, xPxEnd] = xPxRange;
  ctx.fillStyle = band.color;
  const width = Math.max(xPxEnd - xPxStart, STYLE.bandTrack.minBandWidth);
  ctx.fillRect(xPxStart, y1, width, height);

  const box = { x1: xPxStart, x2: xPxStart + width, y1, y2 };
  const hoverBox: HoverBox = { box, label: band.hoverInfo, element: band };
  hoverBoxes.push(hoverBox);

  if (showDetails) {
    if (band.subBands != null) {
      band.subBands.forEach((subBand) => {
        const xPxStart = xScale(subBand.start);
        const xPxEnd = xScale(subBand.end);
        ctx.fillStyle = subBand.color;
        const width = xPxEnd - xPxStart;
        ctx.fillRect(xPxStart, y1, width, height);
      });
    }

    if (band.direction != null) {
      const isForward = band.direction == "+";
      drawArrow(ctx, height, y1, isForward, xPxRange);
    }

    if (isExpanded && band.label != null) {
      drawLabel(ctx, band.label, (xPxRange[0] + xPxRange[1]) / 2, y2, {
        textAlign: "center",
        textBaseline: "top",
      });
    }
  }

  return hoverBoxes;
}

customElements.define("band-track", BandTrack);
