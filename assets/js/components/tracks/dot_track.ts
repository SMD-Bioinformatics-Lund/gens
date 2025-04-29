import { drawHorizontalLineInScale } from "../../draw/shapes";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track/canvas_track";
import {
  drawDotsScaled,
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../draw/render_utils";
import { initializeDragSelect } from "./canvas_track/interactive_tools";

export class DotTrack extends CanvasTrack {
  renderData: DotTrackData | null;
  getRenderData: () => Promise<DotTrackData>;
  yRange: Rng;
  xRange: Rng | null = null;
  xScale: Scale | null = null;
  yTicks: number[];
  onZoom: (xRange: Rng) => void;

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    yRange: Rng,
    yTicks: number[],
    getRenderData: () => Promise<DotTrackData>,
    onZoom: (xRange: Rng) => void
  ) {
    super(id, label, trackHeight);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
    this.yTicks = yTicks;
    this.onZoom = onZoom;
  }

  initialize() {
    super.initialize();
    const startExpanded = true;
    this.initializeExpander(startExpanded);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
    initializeDragSelect(
      this.canvas,
      (pxRangeX: Rng, _pxRangeY: Rng) => {
        if (this.xRange == null) {
          console.error("No xRange set");
        }

        const yAxisWidth = STYLE.yAxis.width;

        const pixelToPos = getLinearScale(
          [yAxisWidth, this.dimensions.width],
          this.xRange,
        );
        const posStart = Math.max(0, pixelToPos(pxRangeX[0]));
        const posEnd = pixelToPos(pxRangeX[1]);
        console.log("Position range:", posStart, posEnd);

        this.onZoom([posStart, posEnd]);
      },
    );
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderLoading();
      this.renderData = await this.getRenderData();
    }

    const { xRange, dots } = this.renderData;
    this.xRange = xRange;
    const yRange = this.yRange;

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.y <= xRange[1],
    );

    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const yAxisWidth = STYLE.yAxis.width;
    const xScale = getLinearScale(xRange, [yAxisWidth, dimensions.width]);
    this.xScale = xScale;
    const yScale = getLinearScale(yRange, [0, dimensions.height]);

    for (const yTick of this.yTicks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale);
    drawYAxis(this.ctx, this.yTicks, yScale, yRange);
    this.drawTrackLabel(yAxisWidth);
  }
}

customElements.define("dot-track", DotTrack);
