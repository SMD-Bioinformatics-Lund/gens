import { STYLE } from "../../constants";
import { drawDotsScaled, getLinearScale } from "../../draw/render_utils";
import { GensSession } from "../../state/gens_session";
import { DataTrack, DataTrackSettings } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  startExpanded: boolean;

  constructor(
    id: string,
    label: string,
    trackType: TrackType,
    getSettings: () => DataTrackSettings,
    updateSettings: (settings: DataTrackSettings) => void,
    getXRange: () => Rng,
    getRenderData: () => Promise<DotTrackData>,
    openTrackContextMenu: (track: DataTrack) => void,
    session: GensSession,
  ) {
    super(
      id,
      label,
      trackType,
      getXRange,
      () => {
        // const xRange = this.renderData.xRange;
        const xRange = getXRange();
        const yAxisWidth = STYLE.yAxis.width;
        const xScale = getLinearScale(xRange, [
          yAxisWidth,
          this.dimensions.width,
        ]);
        return xScale;
      },
      openTrackContextMenu,
      getSettings,
      updateSettings,
      session,
    );
    this.getRenderData = getRenderData;
  }

  connectedCallback(): void {
    super.connectedCallback();

    const onExpand = () => this.render({});
    this.initializeExpander("contextmenu", onExpand);
  }

  override draw(renderData: DotTrackData) {
    super.drawStart();

    const { dots } = renderData;

    const xRange = this.getXRange();
    const xScale = this.getXScale();
    const yScale = this.getYScale();

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.x <= xRange[1],
    );

    const dotsTruncatedY = dotsInRange.map((dot) => {
      const yRange = this.getYRange();
      if (dot.y < yRange[0]) {
        return {
          x: dot.x,
          y: yRange[0],
          color: STYLE.colors.red,
        };
      } else if (dot.y > yRange[1]) {
        return {
          x: dot.x,
          y: yRange[1],
          color: STYLE.colors.red,
        };
      }
      return {
        x: dot.x,
        y: dot.y,
        color: STYLE.colors.black,
      };
    });

    drawDotsScaled(this.ctx, dotsTruncatedY, xScale, yScale, {
      size: STYLE.dotTrack.dotSize,
    });

    super.drawEnd();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }
}

customElements.define("dot-track", DotTrack);
