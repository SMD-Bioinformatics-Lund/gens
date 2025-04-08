import { getOverlapInfo, getTrackHeight } from "../../track/expand_track_utils";
import { getBandYScale, getBoundBoxes } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { calculateBands } from "./band_track";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class TranscriptsTrack extends CanvasTrack {
  renderData: TranscriptsTrackData | null;
  getRenderData: () => Promise<TranscriptsTrackData>;

  async initialize(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<TranscriptsTrackData>,
  ) {
    const expandable = true;
    super.initializeCanvas(label, trackHeight, expandable);
    this.initializeTooltip();
    this.getRenderData = getRenderData;
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    const { xRange, transcripts } = this.renderData;

    const dimensions = super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);
    const { bands: adjustedTranscripts, numberLanes } = calculateBands(
      transcripts,
      dimensions.height,
      this.dimensions.height,
    );

    if (this.expanded) {
      const style = STYLE.bandTrack;
      const expandedHeight = getTrackHeight(
        style.trackHeight.thin,
        numberLanes,
        style.trackPadding,
        style.bandPadding,
      );

      this.assignedHeight = expandedHeight;
    }

    this.hoverTargets = getBoundBoxes(adjustedTranscripts, xScale);

    renderBorder(this.ctx, dimensions, STYLE.tracks.edgeColor);
    renderBands(this.ctx, adjustedTranscripts, xScale);
  }
}

customElements.define("transcripts-track", TranscriptsTrack);
