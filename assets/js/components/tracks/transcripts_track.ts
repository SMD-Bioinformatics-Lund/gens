import { getTrackHeight } from "../../track/expand_track_utils";
import { getOverlapInfo } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";

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

    // FIXME: Generalize with the band tracks
    const overlapInfo = getOverlapInfo(
        transcripts.sort((b1, b2) => (b1.start <= b2.start ? -1 : 1)),
    );
    const maxLane = Math.max(
      ...Object.values(overlapInfo).map((band) => band.lane),
    );
    const numberTracks = maxLane + 1;
        if (this.expanded) {
          const style = STYLE.bandTrack;
          const expandedHeight = getTrackHeight(
            style.trackHeight.thin,
            numberTracks,
            style.trackPadding,
            style.bandPadding,
          );
    
          this.assignedHeight = expandedHeight;
        }

    console.log("Rendering the new transcript");
  }
}

customElements.define("transcripts-track", TranscriptsTrack);
