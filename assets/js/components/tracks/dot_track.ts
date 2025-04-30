import { STYLE } from "../../constants";
import {
  drawDotsScaled,
  getLinearScale,
  renderBackground,
} from "../../draw/render_utils";
import { DataTrack } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  renderData: DotTrackData | null;
  getRenderConfig: () => Promise<DotTrackData>;
  // yRange: Rng;
  // yTicks: number[];

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    yAxis: Axis,
    // yRange: Rng,
    // yTicks: number[],
    getRenderData: () => Promise<DotTrackData>,
    dragCallbacks: DragCallbacks,
  ) {
    super(
      id,
      label,
      () => this.renderData.xRange,
      () => {
        const xRange = this.renderData.xRange;
        const yAxisWidth = STYLE.yAxis.width;
        const xScale = getLinearScale(xRange, [yAxisWidth, this.dimensions.width]);
        return xScale;
      },
      dragCallbacks,
      { defaultTrackHeight: trackHeight, dragSelect: true, yAxis },
    );
    this.getRenderConfig = getRenderData;
  }

  initialize() {
    super.initialize();
    const startExpanded = true;
    const onExpand = () => this.render(false);
    this.initializeExpander("contextmenu", startExpanded, onExpand);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderLoading();
      this.renderData = await this.getRenderConfig();
      // this.xRange = this.renderData.xRange;
    }

    const { dots } = this.renderData;

    // FIXME: Move these to base?
    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    super.render(updateData);

    const xRange = this.getXRange();
    const xScale = this.getXScale();
    const yScale = this.getYScale();

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.y <= xRange[1],
    );

    const yAxisWidth = STYLE.yAxis.width;

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale);
    this.drawTrackLabel(yAxisWidth);
  }
}

customElements.define("dot-track", DotTrack);
