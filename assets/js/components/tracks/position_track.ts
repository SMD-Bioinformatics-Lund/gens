import { STYLE } from "../../constants";
import { drawLabel, drawLine } from "../../draw/shapes";
import { getLinearScale } from "../../draw/render_utils";
import { GensSession } from "../../state/gens_session";
import { padRange, prefixNts, prettyRange } from "../../util/utils";
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

    const [posStart, posEnd] = this.session.getXRange();

    const size = posEnd - posStart;

    const [start, end] = padRange([posStart, posEnd] as Rng, size / 50);

    const xScale = this.getXScale();
    const tickCount = 12;
    const step = (end - start) / (tickCount - 1);
    const tickHeight = 4;

    for (let i = 0; i < tickCount; i++) {
      const pos = start + step * i;
      const x = xScale(pos);
      drawLine(
        this.ctx,
        {
          x1: x,
          x2: x,
          y1: this.dimensions.height,
          y2: this.dimensions.height - tickHeight,
        },
        { color: STYLE.colors.darkGray },
      );
      const label = prefixNts(Math.round(pos), end);
      drawLabel(this.ctx, label, x, this.dimensions.height - tickHeight - 2, {
        textBaseline: "bottom",
        textAlign: "center",
      });
    }

    // const label = prettyRange(start, end);
    // drawLabel(
    //   this.ctx,
    //   label,
    //   STYLE.yAxis.width + STYLE.tracks.textPadding,
    //   this.dimensions.height / 2,
    //   { textBaseline: "middle" },
    // );

    this.drawEnd();
  }
}

customElements.define("position-track", PositionTrack);
