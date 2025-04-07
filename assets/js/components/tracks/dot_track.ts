import { CanvasTrack } from "./canvas_track";
import {
  drawDotsScaled,
  getLinearScale,
  renderBorder,
} from "./render_utils";

export class DotTrack extends CanvasTrack {
  renderData: DotTrackData | null;

  initialize(label: string, trackHeight: number) {
    super.initializeCanvas(label, trackHeight);
  }

  updateRenderData(renderData: DotTrackData) {
    this.renderData = renderData;
  }

  render() {
    if (this.renderData == null) {
      throw Error(`Render data should be assigned before render (current track: ${this.label})`);
    }

    const { xRange, yRange, dots } = this.renderData;

    super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);
    const yScale = getLinearScale(yRange, [0, this.dimensions.height]);

    renderBorder(this.ctx, this.dimensions);
    drawDotsScaled(this.ctx, dots, xScale, yScale);
  }
}

customElements.define("dot-track", DotTrack);
