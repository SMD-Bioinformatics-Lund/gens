import { getOverlapInfo, getTrackHeight } from "../../util/expand_track_utils";
import {
  getBandYScale,
  rangeInRange,
  rangeSurroundsRange,
} from "../../util/utils";
import { COLORS, STYLE } from "../../constants";
import { getLinearScale } from "../../draw/render_utils";
import { drawLabel, drawLine, drawArrow } from "../../draw/shapes";
import { DataTrack, DataTrackSettingsOld } from "./base_tracks/data_track";

const LEFT_PX_EDGE = STYLE.yAxis.width;

export class BandTrack extends DataTrack {
  getPopupInfo: (box: HoverBox) => Promise<PopupContent>;
  openContextMenu: (id: string) => void;

  constructor(
    id: string,
    label: string,
    trackType: TrackType,
    getSettings: () => DataTrackSettingsOld,
    updateSettings: (settings: DataTrackSettingsOld) => void,
    getXRange: () => Rng,
    getRenderData: () => Promise<BandTrackData>,
    openContextMenu: (id: string) => void,
    openTrackContextMenu: ((track: DataTrack) => void) | null,
    getMarkerModeOn: () => boolean,
  ) {
    super(
      id,
      label,
      trackType,
      getXRange,
      // FIXME: Supply xScale directly?
      () => {
        const xRange = getXRange();
        const xScale = getLinearScale(xRange, [
          LEFT_PX_EDGE,
          this.dimensions.width,
        ]);
        return xScale;
      },
      openTrackContextMenu,
      getSettings,
      updateSettings,
      getMarkerModeOn,
    );

    this.getRenderData = getRenderData;
    this.openContextMenu = openContextMenu;
  }

  connectedCallback(): void {
    super.connectedCallback();

    const onElementClick = async (box: HoverBox) => {
      const element = box.element as RenderBand;
      this.openContextMenu(element.id);
    };

    this.initializeHoverTooltip();
    this.initializeClick(onElementClick);
    const onExpand = () => this.render({});
    this.initializeExpander("contextmenu", onExpand);
  }

  override draw(renderData: BandTrackData) {
    const { bands } = renderData;
    const xRange = this.getXRange();
    const ntsPerPx = this.getNtsPerPixel(xRange);
    const showDetails = ntsPerPx < STYLE.tracks.zoomLevel.showDetails;

    this.syncDimensions();

    const xScale = getLinearScale(xRange, [
      LEFT_PX_EDGE,
      this.dimensions.width,
    ]);

    const bandsInView = bands
      .filter((band) => {
        const inRange = rangeInRange([band.start, band.end], xRange);
        const surrounding = rangeSurroundsRange([band.start, band.end], xRange);

        return inRange || surrounding;
      })
      .sort((r1, r2) => (r1.start < r2.start ? -1 : 1));

    const { numberLanes, bandOverlaps } = getOverlapInfo(bandsInView);

    const labelSize =
      this.getIsExpanded() && showDetails ? STYLE.tracks.textLaneSize : 0;

    this.setExpandedTrackHeight(numberLanes, showDetails);

    // FIXME: Investigate why background coloring disappears if doing this further up in function
    // settings expanded track height
    super.drawStart();

    const bandTopBottomPad =
      this.currentHeight > STYLE.bandTrack.dynamicPadThreshold
        ? STYLE.bandTrack.trackPadding
        : this.currentHeight / STYLE.bandTrack.dynamicPadFraction;

    const yScale = getBandYScale(
      bandTopBottomPad,
      this.getIsExpanded() || this.getSettings().yPadBands
        ? STYLE.bandTrack.bandPadding
        : 0,
      this.getIsExpanded() ? numberLanes : 1,
      this.dimensions.height,
      labelSize,
    );

    const renderBand: RenderBand[] = bandsInView.map((band) => {
      if (bandOverlaps[band.id] == null) {
        throw Error(`Missing ID: ${band.id}`);
      }
      const bandNOverlap = bandOverlaps[band.id].lane;
      const yRange = yScale(bandNOverlap, this.getIsExpanded());

      const renderBand = Object.create(band);
      renderBand.y1 = yRange[0];
      renderBand.y2 = yRange[1];
      renderBand.edgeColor = STYLE.bandTrack.edgeColor;

      return renderBand;
    });

    const hoverTargets = renderBand.flatMap((band) => {
      const bandHoverTargets = drawBand(
        this.ctx,
        band,
        xScale,
        showDetails,
        this.getIsExpanded(),
        [LEFT_PX_EDGE, this.dimensions.width],
      );
      return bandHoverTargets;
    });

    this.setHoverTargets(hoverTargets);

    this.drawEnd();
  }

  setExpandedTrackHeight(numberLanes: number, showDetails: boolean) {
    const style = STYLE.bandTrack;
    const height = STYLE.tracks.trackHeight.m;
    const expandedHeight = getTrackHeight(
      height,
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
  screenRange?: Rng,
): HoverBox[] {
  const y1 = band.y1;
  const y2 = band.y2;
  const height = y2 - y1;

  const hoverBoxes: HoverBox[] = [];

  // Body
  const xPxRange: Rng = [xScale(band.start), xScale(band.end)];
  const [xPxStart, xPxEnd] = xPxRange;
  const width = Math.max(xPxEnd - xPxStart, STYLE.bandTrack.minBandWidth);
  const isTranscript = band.subFeatures != null && band.subFeatures.length > 0;

  if (!isTranscript || !showDetails) {
    ctx.fillStyle = band.color;
    ctx.fillRect(xPxStart, y1, width, height);
    const box = { x1: xPxStart, x2: xPxStart + width, y1, y2 };
    const hoverBox: HoverBox = { box, label: band.hoverInfo, element: band };
    hoverBoxes.push(hoverBox);
  }

  if (showDetails && isTranscript) {
    const midY = y1 + height / 2;
    drawLine(
      ctx,
      { x1: xPxStart, x2: xPxEnd, y1: midY, y2: midY },
      { color: band.color, lineWidth: 2, transpose_05: false },
    );

    if (band.direction != null) {
      drawDirectionArrows(ctx, band, height, xPxRange, midY, band.color);
    }

    band.subFeatures.forEach((subBand) => {
      if (
        xScale(subBand.start) >= xPxRange[0] &&
        xScale(subBand.end) <= xPxRange[1]
      ) {
        const box = drawExon(
          ctx,
          band,
          subBand,
          xScale,
          band.color,
          y1,
          height,
        );
        hoverBoxes.push(box);
      }
    });

    hoverBoxes.push(...getIntronHoverBoxes(band, midY, xScale));

    if (isExpanded && band.label != null) {
      drawTrackLabel(ctx, screenRange, xPxRange, band, y2);
    }
  }

  return hoverBoxes;
}

function drawDirectionArrows(
  ctx: CanvasRenderingContext2D,
  band: RenderBand,
  height: number,
  xPxRange: Rng,
  midY: number,
  detailColor: string,
) {
  const [xPxStart, xPxEnd] = xPxRange;
  const isForward = band.direction == "+";
  const spacing = STYLE.bandTrack.arrowSpacing;
  const arrowHeight = height * STYLE.bandTrack.arrowHeightFraction;
  let pos = isForward ? xPxStart + spacing : xPxEnd - spacing;
  while (
    isForward ? pos < xPxEnd - spacing / 2 : pos > xPxStart + spacing / 2
  ) {
    drawArrow(ctx, pos, midY, isForward ? 1 : -1, arrowHeight, {
      lineWidth: STYLE.bandTrack.arrowLineWidth,
      color: detailColor,
    });
    pos += isForward ? spacing : -spacing;
  }
}

function drawExon(
  ctx: CanvasRenderingContext2D,
  band: RenderBand,
  subBand: TranscriptFeature,
  xScale: Scale,
  detailColor: string,
  y1: number,
  height: number,
): HoverBox {
  const xPxStart = xScale(subBand.start);
  const xPxEnd = xScale(subBand.end);
  ctx.fillStyle = detailColor;
  const width = Math.max(xPxEnd - xPxStart, STYLE.bandTrack.minBandWidth);

  const drawHeight = height;
  const yStart = y1;
  const label = `Exon: ${subBand.exonNumber}/${band.exonCount}`;
  if (subBand.feature != null && subBand.feature !== "exon") {
    ctx.fillStyle = COLORS.lightGray;
  }
  ctx.fillRect(xPxStart, y1, width, drawHeight);

  const hoverBox = {
    box: { x1: xPxStart, x2: xPxEnd, y1: yStart, y2: yStart + drawHeight },
    label,
    element: band,
  };
  return hoverBox;
}

function drawTrackLabel(
  ctx: CanvasRenderingContext2D,
  screenRange: Rng,
  pxRange: Rng,
  band: RenderBand,
  y2: number,
) {
  const [xPxStart, xPxEnd] = pxRange;
  const labelRangeStart = screenRange
    ? Math.max(xPxStart, screenRange[0])
    : xPxStart;
  const labelRangeEnd = screenRange ? Math.min(xPxEnd, screenRange[1]) : xPxEnd;
  const mid = (labelRangeStart + labelRangeEnd) / 2;
  drawLabel(ctx, band.label, mid, y2, {
    textAlign: "center",
    textBaseline: "top",
  });
}

function getIntronHoverBoxes(
  band: RenderBand,
  midY: number,
  xScale: Scale,
): HoverBox[] {
  const exons = band.subFeatures;
  const introns: { start: number; end: number }[] = [];
  let prev = band.start;
  exons.forEach((e) => {
    if (e.start > prev) {
      introns.push({ start: prev, end: e.start });
    }
    prev = e.end;
  });
  if (band.end > prev) {
    introns.push({ start: prev, end: band.end });
  }

  const hoverBoxes = introns.map((intron, i) => {
    const x1 = xScale(intron.start);
    const x2 = xScale(intron.end);
    return {
      box: { x1, x2, y1: midY - 2, y2: midY + 2 },
      label: `Intron ${i + 1}/${Math.max(band.exonCount - 1, 1)}`,
      element: band,
    };
  });
  return hoverBoxes;
}

customElements.define("band-track", BandTrack);
