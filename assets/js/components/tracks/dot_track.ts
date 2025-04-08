import { STYLE } from "../../util/constants";
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

  async initialize(label: string, trackHeight: number, yRange: Rng, getRenderData: () => Promise<DotTrackData>) {
    super.initializeCanvas(label, trackHeight, false);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
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

    super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);
    const yScale = getLinearScale(yRange, [0, this.dimensions.height]);

    renderBorder(this.ctx, this.dimensions, STYLE.tracks.edgeColor);
    drawDotsScaled(this.ctx, dots, xScale, yScale);
  }
}

customElements.define("dot-track", DotTrack);
