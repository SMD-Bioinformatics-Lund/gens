import { STYLE } from "../../constants";
import {
  drawDotsScaled,
  drawYAxis,
  getLinearScale,
} from "../../draw/render_utils";
import { drawLine } from "../../draw/shapes";
import { generateTicks, getTickSize } from "../../util/utils";
import { DataTrack } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  startExpanded: boolean;

  constructor(
    id: string,
    label: string,
    trackType: TrackType,
    getSettings: () => DataTrackSettings,
    setExpanded: (isExpanded: boolean) => void,
    getXRange: () => Rng,
    getRenderData: () => Promise<DotTrackData>,
    openTrackContextMenu: (track: DataTrack) => void,
    getMarkerModeOn: () => boolean,
  ) {
    super(
      id,
      label,
      trackType,
      getXRange,
      () => {
        // const xRange = this.renderData.xRange;
        const xRange = getXRange();
        const yAxisWidth = STYLE.yAxis.width;
        const xScale = getLinearScale(xRange, [
          yAxisWidth,
          this.dimensions.width,
        ]);
        return xScale;
      },
      openTrackContextMenu,
      getSettings,
      setExpanded,
      (_height: number) => {
        console.warn("Set expanded height not used for dot tracks");
      },
      getMarkerModeOn,
    );
    this.getRenderData = getRenderData;
  }

  connectedCallback(): void {
    super.connectedCallback();

    const onExpand = () => this.render({});
    this.initializeExpander("contextmenu", onExpand);
  }

  override draw(renderData: DotTrackData) {
    super.syncDimensions();
    // super.drawStart();

    if (this.getSettings().yAxis != null) {
      renderYAxis(
        this.ctx,
        this.getSettings().yAxis,
        this.getYScale(),
        this.dimensions,
        this.getSettings(),
      );
    }

    const { dots } = renderData;

    const xRange = this.getXRange();
    const xScale = this.getXScale();
    const yScale = this.getYScale();

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.x <= xRange[1],
    );

    const dotsTruncatedY = dotsInRange.map((dot) => {
      const yRange = this.getYRange();
      const copy = { ...dot, color: STYLE.colors.black };
      if (dot.y < yRange[0]) {
        copy.y = yRange[0];
        copy.color = STYLE.colors.red;
      } else if (dot.y > yRange[1]) {
        copy.y = yRange[1];
        copy.color = STYLE.colors.red;
      }
      return copy;
    });

    drawDotsScaled(this.ctx, dotsTruncatedY, xScale, yScale, {
      size: STYLE.dotTrack.dotSize,
    });

    super.drawEnd();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }
}

export function renderYAxis(
  ctx: CanvasRenderingContext2D,
  yAxis: Axis,
  yScale: Scale,
  dimensions: Dimensions,
  settings: { isExpanded?: boolean },
) {
  const tickSize = getTickSize(yAxis.range);
  const ticks = generateTicks(yAxis.range, tickSize);

  for (const yTick of ticks) {
    const yPx = yScale(yTick);

    const lineDims = {
      x1: STYLE.yAxis.width,
      x2: dimensions.width,
      y1: yPx,
      y2: yPx,
    };

    drawLine(ctx, lineDims, {
      color: STYLE.colors.lighterGray,
      dashed: false,
    });
  }

  const hideLabel = yAxis.hideLabelOnCollapse && !settings.isExpanded;

  const label = hideLabel ? "" : yAxis.label;
  const renderTicks = settings.isExpanded
    ? ticks
    : [ticks[0], ticks[ticks.length - 1]];

  console.log("Rendering with ticks", renderTicks);

  drawYAxis(ctx, renderTicks, yScale, yAxis.range, label);
}

customElements.define("dot-track", DotTrack);
