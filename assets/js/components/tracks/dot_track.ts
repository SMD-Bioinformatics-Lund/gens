import { STYLE } from "../../constants";
import { drawDotsScaled, getLinearScale } from "../../draw/render_utils";
import { GensSession } from "../../state/gens_session";
import { DataTrack, DataTrackSettings, ExpandedTrackHeight } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  startExpanded: boolean;

  constructor(
    id: string,
    label: string,
    trackType: TrackType,
    getSettings: () => DataTrackSettings,
    updateSettings: (settings: DataTrackSettings) => void,
    // yAxis: Axis,
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

    if (!this.getSettings) {
      return;
    }

    const onExpand = () => this.render({});
    this.initializeExpander("contextmenu", onExpand);
    this.setExpandedHeight(this.getSettings().height.expandedHeight);
  }

  override draw() {
    super.drawStart();

    const { dots } = this.renderData as DotTrackData;

    const xRange = this.getXRange();
    const xScale = this.getXScale();
    const yScale = this.getYScale();

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.y <= xRange[1],
    );

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale, {
      size: STYLE.dotTrack.dotSize,
      color: STYLE.dotTrack.dotColor,
    });

    super.drawEnd();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }
}

customElements.define("dot-track", DotTrack);
