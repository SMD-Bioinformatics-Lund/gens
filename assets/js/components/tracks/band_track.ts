import { getOverlapInfo, getTrackHeight } from "../../track/expand_track_utils";
import { getBandYScale, getBoundBoxes } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
  renderData: BandTrackData | null;
  getRenderData: () => Promise<BandTrackData>;

  async initialize(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<BandTrackData>,
  ) {
    super.initializeCanvas(label, trackHeight);
    this.initializeTooltip();
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
    console.log(ntsPerPx);
    const showDetails = ntsPerPx < STYLE.tracks.zoomLevel.showDetails;
    const dimensions = super.syncDimensions();
    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    const { numberLanes, bandOverlaps } = getOverlapInfo(bands);

    const labelSize = (this.isExpanded() && showDetails) ? 20 : 0;
    const yScale = getBandYScale(
      STYLE.bandTrack.trackPadding,
      STYLE.bandTrack.bandPadding,
      this.isExpanded() ? numberLanes : 1,
      this.dimensions.height,
      labelSize
    );

    const renderBand: RenderBand[] = bands.map((band) => {
      if (bandOverlaps[band.id] == null) {
        throw Error(`Missing ID: ${band.id}`);
      }
      const bandNOverlap = bandOverlaps[band.id].lane;
      let yRange = yScale(bandNOverlap, this.isExpanded());
      const y1 = yRange[0];
      const y2 = yRange[1];
      const edgeColor = STYLE.bandTrack.edgeColor;

      const renderBand = {
        id: band.id,
        start: band.start,
        end: band.end,
        y1,
        y2,
        color: "blue",
        edgeColor,
        label: band.id,
      };

      return renderBand;
    });

    this.setExpandedTrackHeight(numberLanes, showDetails);

    // FIXME: Different hover boxes for sub-ranges (exons)
    this.hoverTargets = getBoundBoxes(renderBand, xScale);
    renderBorder(this.ctx, dimensions, STYLE.tracks.edgeColor);
    // renderBands(this.ctx, renderBand, xScale);

    bands.forEach((band) => drawBand(this.ctx, band, xScale, showDetails, this.isExpanded()));
  }

  setExpandedTrackHeight(numberLanes: number, showDetails: boolean) {
    if (this.isExpanded()) {
      const style = STYLE.bandTrack;
      const showLabels = false;
      const expandedHeight = getTrackHeight(
        style.trackHeight.thin,
        numberLanes,
        style.trackPadding,
        style.bandPadding,
        showLabels,
      );
      super.setExpandedHeight(expandedHeight);
    }
  }
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  band: RenderBand,
  xScale: (number) => number,
  showDetails: boolean,
  isExpanded: boolean,
) {
  console.log("Drawing", band);

  const y1 = band.y1;
  const y2 = band.y2;
  const height = y2 - y1;

  // Body
  const xPxRange: Rng = [xScale(band.start), xScale(band.end)];
  const [xPxStart, xPxEnd] = xPxRange;
  ctx.fillStyle = STYLE.colors.lightGray;
  const width = xPxEnd - xPxStart;
  ctx.fillRect(xPxStart, y1, width, height);

  if (showDetails) {
    if (band.subBands != null) {
      band.subBands.forEach((exon) => {
        const xPxStart = xScale(exon.start);
        const xPxEnd = xScale(exon.end);
        ctx.fillStyle = STYLE.colors.orange;
        const width = xPxEnd - xPxStart;
        ctx.fillRect(xPxStart, y1, width, height);
      });
    }

    if (band.direction != null) {
      const isForward = band.direction == "+";
      drawArrow(ctx, height, y1, isForward, xPxRange);
    }

    if (isExpanded) {
      drawLabel(ctx, band.label, xPxRange, y2);
    }
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  xPxRange: Rng,
  bottomY: number,
) {
  const [xPxStart, xPxEnd] = xPxRange;
  const textX = (xPxStart + xPxEnd) / 2;
  const textY = bottomY + STYLE.tracks.textPadding;

  ctx.font = STYLE.tracks.font;
  ctx.fillStyle = STYLE.tracks.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillText(label, textX, textY);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  bandHeight: number,
  y1: number,
  isForward: boolean,
  xPxRange: Rng,
) {
  const [xPxStart, xPxEnd] = xPxRange;
  const arrowHeight = bandHeight;
  const arrowWidth = arrowHeight * 0.5;
  const arrowYCenter = y1 + bandHeight / 2;
  ctx.fillStyle = STYLE.colors.darkGray;
  ctx.beginPath();
  if (isForward) {
    ctx.moveTo(xPxEnd + arrowWidth, arrowYCenter);
    ctx.lineTo(xPxEnd, arrowYCenter - arrowHeight / 2);
    ctx.lineTo(xPxEnd, arrowYCenter + arrowHeight / 2);
  } else {
    ctx.moveTo(xPxStart - arrowWidth, arrowYCenter);
    ctx.lineTo(xPxStart, arrowYCenter - arrowHeight / 2);
    ctx.lineTo(xPxStart, arrowYCenter + arrowHeight / 2);
  }
  ctx.closePath();
  ctx.fill();
}

customElements.define("band-track", BandTrack);
