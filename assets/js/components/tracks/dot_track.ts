import { drawHorizontalLineInScale } from "../../draw/shapes";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track";
import {
  drawDotsScaled,
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../draw/render_utils";

export class DotTrack extends CanvasTrack {
  renderData: DotTrackData | null;
  getRenderData: () => Promise<DotTrackData>;
  yRange: Rng;
  yTicks: number[];

  constructor(
    label: string,
    trackHeight: number,
    yRange: Rng,
    yTicks: number[],
    getRenderData: () => Promise<DotTrackData>,
  ) {
    super(label, trackHeight);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
    this.yTicks = yTicks;
  }

  initialize() {
    super.initialize();
    const startExpanded = true;
    this.initializeExpander(startExpanded);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    const { xRange, dots } = this.renderData;
    const yRange = this.yRange;

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.y <= xRange[1],
    );

    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const xScale = getLinearScale(xRange, [0, dimensions.width]);
    const yScale = getLinearScale(yRange, [0, dimensions.height]);

    for (const yTick of this.yTicks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale);
    drawYAxis(this.ctx, this.yTicks, yScale, yRange);
    const shiftRight = STYLE.yAxis.width;
    this.drawTrackLabel(shiftRight);
  }
}

customElements.define("dot-track", DotTrack);
