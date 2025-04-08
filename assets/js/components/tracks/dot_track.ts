import { CanvasTrack } from "./canvas_track";
import {
  drawDotsScaled,
  getLinearScale,
  renderBorder,
} from "./render_utils";

export class DotTrack extends CanvasTrack {
  renderData: DotTrackData | null;
  getRenderData: () => Promise<DotTrackData>;
  yRange: Rng;

  initialize(label: string, trackHeight: number, yRange: Rng, getRenderData: () => Promise<DotTrackData>) {
    super.initializeCanvas(label, trackHeight);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
  }

  async updateRenderData() {
    this.renderData = await this.getRenderData();
  }

  render() {
    if (this.renderData == null) {
      throw Error(`Render data should be assigned before render (current track: ${this.label})`);
    }

    const { xRange, dots } = this.renderData;
    const yRange = this.yRange;

    super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);
    const yScale = getLinearScale(yRange, [0, this.dimensions.height]);

    renderBorder(this.ctx, this.dimensions);
    drawDotsScaled(this.ctx, dots, xScale, yScale);
  }
}

customElements.define("dot-track", DotTrack);
