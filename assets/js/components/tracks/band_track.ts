import { getOverlapInfo, getTrackHeight } from "../../util/expand_track_utils";
import {
  getBandYScale,
  rangeInRange,
  rangeSurroundsRange,
} from "../../util/utils";
import { STYLE } from "../../constants";
import { drawArrow, getLinearScale } from "../../draw/render_utils";
import { drawLabel } from "../../draw/shapes";
import { DataTrack } from "./base_tracks/data_track";
import { GensSession } from "../../state/gens_session";

const LEFT_PX_EDGE = STYLE.yAxis.width;

export class BandTrack extends DataTrack {
  getPopupInfo: (box: HoverBox) => Promise<PopupContent>;
  openContextMenu: (id: string) => void;

  constructor(
    id: string,
    label: string,
    trackType: TrackType,
    trackHeight: number,
    getXRange: () => Rng,
    getRenderData: () => Promise<BandTrackData>,
    openContextMenu: (id: string) => void,
    openTrackContextMenu: (track: DataTrack) => void,
    session: GensSession,
  ) {
    super(
      id,
      label,
      trackType,
      getXRange,
      // FIXME: Supply xScale directly?
      () => {
        const xRange = this.renderData.xRange;
        const xScale = getLinearScale(xRange, [
          LEFT_PX_EDGE,
          this.dimensions.width,
        ]);
        return xScale;
      },
      openTrackContextMenu,
      {
        defaultHeight: trackHeight,
        dragSelect: true,
        yAxis: null,
      },
      session,
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
    const startExpanded = false;
    const onExpand = () => this.render({});
    this.initializeExpander("contextmenu", startExpanded, onExpand);
  }

  disconnectedCallback(): void {
      super.disconnectedCallback();
  }

  override draw() {
    super.drawStart();

    const { bands, xRange } = this.renderData as BandTrackData;
    const ntsPerPx = this.getNtsPerPixel(xRange);
    const showDetails = ntsPerPx < STYLE.tracks.zoomLevel.showDetails;


    const xScale = getLinearScale(xRange, [
      LEFT_PX_EDGE,
      this.dimensions.width,
    ]);

    const bandsInView = bands.filter((band) => {
      const inRange = rangeInRange([band.start, band.end], xRange);
      const surrounding = rangeSurroundsRange([band.start, band.end], xRange);

      return inRange || surrounding;
    }).sort((r1, r2) => r1.start < r2.start ? -1 : 1);

    const { numberLanes, bandOverlaps } = getOverlapInfo(bandsInView);

    const labelSize =
      this.isExpanded() && showDetails ? STYLE.tracks.textLaneSize : 0;

    this.setExpandedTrackHeight(numberLanes, showDetails);

    const yScale = getBandYScale(
      STYLE.bandTrack.trackPadding,
      STYLE.bandTrack.bandPadding,
      this.isExpanded() ? numberLanes : 1,
      this.dimensions.height,
      labelSize,
    );

    const renderBand: RenderBand[] = bandsInView.map((band) => {
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

    const hoverTargets = renderBand.flatMap((band) => {
      const bandHoverTargets = drawBand(
        this.ctx,
        band,
        xScale,
        showDetails,
        this.isExpanded(),
        [LEFT_PX_EDGE, this.dimensions.width],
      );
      return bandHoverTargets;
    });

    this.setHoverTargets(hoverTargets);

    this.drawEnd();
  }

  setExpandedTrackHeight(numberLanes: number, showDetails: boolean) {
    const style = STYLE.bandTrack;
    const height = STYLE.tracks.trackHeight.thin;
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

  const detailColor = STYLE.colors.darkGray;

  // Body
  const xPxRange: Rng = [xScale(band.start), xScale(band.end)];
  let [xPxStart, xPxEnd] = xPxRange;
  // Make sure bands keep within their drawing area
  if (screenRange != null) {
    if (xPxRange[0] < screenRange[0]) {
      xPxStart = screenRange[0];
    }
    if (xPxRange[1] > screenRange[1]) {
      xPxEnd = screenRange[1];
    }
  }
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
        ctx.fillStyle = detailColor;
        const width = xPxEnd - xPxStart;
        ctx.fillRect(xPxStart, y1, width, height);
      });
    }

    if (band.direction != null) {
      const isForward = band.direction == "+";
      drawArrow(ctx, height, y1, isForward, xPxRange, detailColor);
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
