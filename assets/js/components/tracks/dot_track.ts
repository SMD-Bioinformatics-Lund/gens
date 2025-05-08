import { STYLE } from "../../constants";
import { drawDotsScaled, getLinearScale } from "../../draw/render_utils";
import { GensSession } from "../../state/session";
import { pointInRange } from "../../util/utils";
import { DataTrack } from "./base_tracks/data_track";

export class DotTrack extends DataTrack {
  startExpanded: boolean;

  // // FIXME: Look into color bands next
  // private colorBands: RenderBand[] | null = null;

  // updateColors(colorBands: RenderBand[] | null) {
  //   this.colorBands = colorBands;
  //   this.render({});
  // }

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    startExpanded: boolean,
    yAxis: Axis,
    getRenderData: () => Promise<DotTrackData>,
    openTrackContextMenu: (track: DataTrack) => void,
    session: GensSession,
  ) {
    super(
      id,
      label,
      () => this.renderData.xRange,
      () => {
        const xRange = this.renderData.xRange;
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

  draw() {
    super.drawStart();

    const { dots } = this.renderData as DotTrackData;

    const xRange = this.getXRange();
    const xScale = this.getXScale();
    const yScale = this.getYScale();

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.y <= xRange[1],
    );

    // // FIXME: Try adding Canvas bands instead
    // let coloredDots = [...dotsInRange];
    // if (this.colorBands != null) {
    //   console.log("Looping the bands", coloredDots);
    //   for (const band of this.colorBands) {
    //     coloredDots
    //       .filter((dot) => pointInRange(dot.x, [band.start, band.end]))
    //       .forEach((dot) => {
    //         if (band.color) {
    //           dot.color = band.color;
    //         }
    //       });
    //   }
    // }

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale);

    super.drawEnd();
  }
}

customElements.define("dot-track", DotTrack);
