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
  startExpanded: boolean;

  private _renderSeq = 0;

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
    this.getRenderConfig = getRenderData;
  }

  initialize() {
    super.initialize();
    const onExpand = () => this.render(false);
    this.initializeExpander("contextmenu", this.startExpanded, onExpand);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
  }

  async render(updateData: boolean) {

    this._renderSeq = this._renderSeq + 1;
    const mySeq = this._renderSeq;

    console.log(this.label, "Rendering dot track", updateData);

    if (updateData || this.renderData == null) {
      this.renderLoading();

      const data = await this.getRenderConfig();

      if (mySeq !== this._renderSeq) {
        console.log(this.label, "Returning different seq numbers", mySeq, this._renderSeq);
        return;
      }
      console.log(this.label, "Rendering", mySeq);
      this.renderData = data;
    }

    const { dots } = this.renderData;

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
