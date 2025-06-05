import { STYLE } from "../../constants";
import { drawLabel } from "../../draw/shapes";
import { getLinearScale } from "../../draw/render_utils";
import { GensSession } from "../../state/gens_session";
import { prettyRange } from "../../util/utils";
import { DataTrack, DataTrackSettings } from "./base_tracks/data_track";

export class PositionTrack extends DataTrack {

  constructor(
    id: string,
    label: string,
    getSettings: () => DataTrackSettings,
    updateSettings: (settings: DataTrackSettings) => void,
    session: GensSession,
  ) {
    const getXRange = () => session.getXRange();
    const getXScale = () => {
      const xRange = session.getXRange();
      return getLinearScale(xRange, [STYLE.yAxis.width, this.dimensions.width]);
    };
    super(
      id,
      label,
      "position" as TrackType,
      getXRange,
      getXScale,
      null,
      getSettings,
      updateSettings,
      session,
    );
    this.session = session;
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  // Unused but required by abstract class
  draw(_renderData: any): void {
    super.syncDimensions();
    this.drawStart();

    const [start, end] = this.session.getXRange();
    const label = prettyRange(start, end);
    drawLabel(
      this.ctx,
      label,
      STYLE.yAxis.width + STYLE.tracks.textPadding,
      this.dimensions.height / 2,
      { textBaseline: "middle" },
    );

    this.drawEnd();
  }
}

customElements.define("position-track", PositionTrack);
