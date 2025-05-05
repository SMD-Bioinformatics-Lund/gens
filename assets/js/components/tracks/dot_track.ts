import { STYLE } from "../../constants";
import { drawDotsScaled, getLinearScale } from "../../draw/render_utils";
import { DataTrack } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  startExpanded: boolean;

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    startExpanded: boolean,
    yAxis: Axis,
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
        const xScale = getLinearScale(xRange, [
          yAxisWidth,
          this.dimensions.width,
        ]);
        return xScale;
      },
      dragCallbacks,
      { defaultHeight: trackHeight, dragSelect: true, yAxis },
    );
    this.startExpanded = startExpanded;
    this.getRenderData = getRenderData;
  }

  initialize() {
    super.initialize();
    const onExpand = () => this.render(false);
    this.initializeExpander("contextmenu", this.startExpanded, onExpand);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
  }

  draw() {
    super.draw();

    const { dots } = this.renderData as DotTrackData;

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
