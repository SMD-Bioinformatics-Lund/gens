import { SIZES, STYLE } from "../../constants";
import { drawLabel, drawLine } from "../../draw/shapes";
import { getLinearScale } from "../../draw/render_utils";
import { padRange, prefixNts } from "../../util/utils";
import { DataTrack, DataTrackSettings } from "./base_tracks/data_track";

export class PositionTrack extends DataTrack {
  constructor(
    id: string,
    label: string,
    getSettings: () => DataTrackSettings,
    updateSettings: (settings: DataTrackSettings) => void,
    getMarkerModeOn: () => boolean,
    getXRange: () => Rng,
  ) {
    const getXScale = () => {
      const xRange = getXRange();
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
      getMarkerModeOn,
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  draw(_renderData): void {
    super.syncDimensions();
    this.drawStart();

    const [posStart, posEnd] = this.getXRange();

    const size = posEnd - posStart;

    const style = STYLE.positionTrack;

    const [start, end] = padRange(
      [posStart, posEnd] as Rng,
      size * style.sizePadFraction,
    );

    const xScale = this.getXScale();
    const tickCount = style.tickCount;
    const step = (end - start) / (tickCount - 1);
    const tickHeight = style.tickHeight;

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
      drawLabel(
        this.ctx,
        label,
        x,
        this.dimensions.height - tickHeight - SIZES.xxs,
        {
          textBaseline: "bottom",
          textAlign: "center",
        },
      );
    }

    this.drawEnd();
  }
}

customElements.define("position-track", PositionTrack);
