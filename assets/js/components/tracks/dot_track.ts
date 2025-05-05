import { STYLE } from "../../constants";
import {
  drawDotsScaled,
  getLinearScale,
  renderBackground,
} from "../../draw/render_utils";
import { DataTrack } from "./base_tracks/data_track";

import debounce from "lodash.debounce";

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

  private _fetchData = debounce(
    async () => {
      this._renderSeq = this._renderSeq + 1;
      const mySeq = this._renderSeq;

      console.log(this.label, "Get the render config");
      this.renderData = await this.getRenderConfig();

      if (mySeq !== this._renderSeq) {
        return;
      }
      this.draw();
    },
    500,
    { leading: false, trailing: true },
  );

  async render(updateData: boolean) {
    this.renderLoading();
    if (updateData || this.renderData == null) {
      this._fetchData();
    } else {
      this.draw();
    }
  }

  private draw() {

    // console.log(this.label, "Rendering dot track", updateData);

    // const data = await this.getRenderConfig();

    // this.renderData = data;

    console.log(this.label, "Drawing");

    const { dots } = this.renderData;

    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const placeholder = true;
    super.render(placeholder);

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
