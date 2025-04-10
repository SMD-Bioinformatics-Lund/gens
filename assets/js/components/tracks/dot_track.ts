import { drawHorizontalLine } from "../../draw/shapes";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track";
import { drawDotsScaled, drawYAxis, getLinearScale } from "../../draw/render_utils";

export class DotTrack extends CanvasTrack {
  renderData: DotTrackData | null;
  getRenderData: () => Promise<DotTrackData>;
  yRange: Rng;
  yTicks: number[];

  async initialize(
    label: string,
    trackHeight: number,
    yRange: Rng,
    yTicks: number[],
    getRenderData: () => Promise<DotTrackData>,
  ) {
    super.initializeCanvas(label, trackHeight);
    const startExpanded = true;
    this.initializeExpander(trackHeight, startExpanded);
    this.setExpandedHeight(trackHeight * 2);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
    this.yTicks = yTicks;
    await this.updateRenderData();
  }

  async updateRenderData() {
    this.renderData = await this.getRenderData();
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    const { xRange, dots } = this.renderData;
    const yRange = this.yRange;

    super.baseRender();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);
    const yScale = getLinearScale(yRange, [0, this.dimensions.height]);

    for (const yTick of this.yTicks) {
      drawHorizontalLine(this.ctx, yTick, yScale, STYLE.colors.lightGray, true);
    }

    drawDotsScaled(this.ctx, dots, xScale, yScale);
    drawYAxis(this.ctx, this.yTicks, yScale, yRange);
    const shiftRight = STYLE.yAxis.width;
    this.drawTrackLabel(shiftRight);
  }
}

customElements.define("dot-track", DotTrack);
