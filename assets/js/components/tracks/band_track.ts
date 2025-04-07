import {
  getOverlapInfo,
  rangesOverlap,
  rangeSurroundsRange,
} from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
  renderData: BandTrackData | null;
  // FIXME: Should this be calculated outside the track?
  processedRenderData: {
    bands: RenderBand[];
    numberTracks: number;
    // How many bands are already rendered that overlaps with the current one
    nPriorBandOverlaps: Record<string, number>;
  };

  initialize(
    label: string,
    trackHeight: number,
    thickTrackHeight: number | null = null,
  ) {
    super.initializeCanvas(label, trackHeight, thickTrackHeight);
    this.initializeTooltip();
  }

  updateRenderData(renderData: {
    xRange: Rng;
    bands: RenderBand[];
    settings: { bandPad: number };
  }) {
    this.renderData = renderData;
  }

  render() {
    if (this.renderData == null) {
      throw Error(`No render data assigned for track: ${this.label}`);
    }

    const { bands, xRange, settings } = this.renderData;

    const overlapInfo = getOverlapInfo(
      bands.sort((b1, b2) => (b1.start <= b2.start ? -1 : 1)),
    );
    console.log(overlapInfo);
    const maxLane = Math.max(
      ...Object.values(overlapInfo).map((band) => band.lane),
    );
    const numberTracks = maxLane + 1;

    console.log(overlapInfo)
    console.log(maxLane, numberTracks);

    if (this.expanded) {
      // FIXME: Refactor

      const singleBandHeight =
        STYLE.render.trackHeight.thin -
        (STYLE.render.topBottomPadding + STYLE.render.bandPadding) * 2;
      const multiTrackHeight =
        STYLE.render.topBottomPadding * 2 +
        (singleBandHeight + STYLE.render.bandPadding * 2) * numberTracks;
      const assignedHeight = multiTrackHeight;
      // const assignedHeight = STYLE.render.trackHeight.thin * numberTracks;
      this.assignedHeight = assignedHeight;
    }

    const dimensions = super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    const yScale = getYScale(
      STYLE.render.topBottomPadding,
      STYLE.render.bandPadding,
      this.expanded ? numberTracks : 1,
      dimensions.height,
    );

    // FIXME: Verify - is it working correctly
    // Looking a bit strange sometimes for multiple stacked tracks
    const scaledBands: RenderBand[] = bands.map((band) => {
      const scaledBand = Object.create(band);
      const bandNOverlap = overlapInfo[band.id].lane;
      let yRange = yScale(bandNOverlap, this.expanded);
      scaledBand.y1 = yRange[0];
      scaledBand.y2 = yRange[1];
      return scaledBand;
    });

    // FIXME: Util function?
    this.hoverTargets = scaledBands.map((band) => {
      return {
        label: band.label,
        x1: xScale(band.start),
        x2: xScale(band.end),
        y1: band.y1,
        y2: band.y2,
      };
    });

    renderBorder(this.ctx, dimensions);
    renderBands(this.ctx, scaledBands, xScale);
  }
}

function getYScale(
  topBottomPad: number,
  bandPad: number,
  numberTracks: number,
  renderingHeight: number,
): (number, bool) => Rng {
  return (pos: number, expanded: boolean) => {
    const renderingArea =
      renderingHeight - topBottomPad * 2 - bandPad * numberTracks;
    const trackHeight = renderingArea / numberTracks;

    let yShift = 0;
    if (expanded) {
      yShift = pos * trackHeight;
    }
    const y1 = topBottomPad + yShift + bandPad;
    const y2 = topBottomPad + yShift + trackHeight - bandPad;

    return [y1, y2];
  };
}

customElements.define("band-track", BandTrack);
