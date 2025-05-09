import { STYLE } from "../../constants";
import { drawDotsScaled, getLinearScale } from "../../draw/render_utils";
import { GensSession } from "../../state/gens_session";
import { DataTrack } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  startExpanded: boolean;

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    startExpanded: boolean,
    yAxis: Axis,
    getXRange: () => Rng,
    getRenderData: () => Promise<DotTrackData>,
    openTrackContextMenu: (track: DataTrack) => void,
    session: GensSession,
  ) {
    super(
      id,
      label,
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
      { defaultHeight: trackHeight, dragSelect: true, yAxis },
      session,
    );
    this.startExpanded = startExpanded;
    this.getRenderData = getRenderData;
  }

  initialize() {
    super.initialize();
    const onExpand = () => this.render({});
    this.initializeExpander("contextmenu", this.startExpanded, onExpand);
    this.setExpandedHeight(this.defaultTrackHeight * 2);
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

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale);

    super.drawEnd();
  }
}

customElements.define("dot-track", DotTrack);
