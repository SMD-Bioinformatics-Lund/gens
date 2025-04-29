import { drawHorizontalLineInScale } from "../../draw/shapes";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track/canvas_track";
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
  xRange: Rng | null = null;
  xScale: Scale | null = null;
  yTicks: number[];

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    yRange: Rng,
    yTicks: number[],
    getRenderData: () => Promise<DotTrackData>,
  ) {
    super(id, label, trackHeight);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
    this.yTicks = yTicks;
  }

  initialize() {
    super.initialize();
    const startExpanded = true;
    this.initializeExpander(startExpanded);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
    this.initializeDragSelect(
      () => this.xScale,
      () => this.xRange,

      (rangeX: Rng, rangeY: Rng) => {
        // console.log("Drag released with range:", range);

        if (this.xRange == null) {
          console.error("No xRange set");
        }

        const pixelToPos = getLinearScale(
          [0, this.dimensions.width],
          this.xRange,
        );
        const posStart = pixelToPos(rangeX[0]);
        const posEnd = pixelToPos(rangeX[1]);
        console.log("Position range:", posStart, posEnd);
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

    const xScale = getLinearScale(xRange, [0, dimensions.width]);
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
    const shiftRight = STYLE.yAxis.width;
    this.drawTrackLabel(shiftRight);
  }
}

customElements.define("dot-track", DotTrack);
