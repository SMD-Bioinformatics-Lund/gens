import { getOverlapInfo } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
  renderData: BandTrackData | null;
  getRenderData: () => Promise<BandTrackData>;

  async initialize(
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<BandTrackData>,
  ) {
    super.initializeCanvas(label, trackHeight);
    this.initializeTooltip();
    this.getRenderData = getRenderData;
    await this.updateRenderData();
  }

  async updateRenderData() {
    this.renderData = await this.getRenderData();
  }

  render() {
    if (this.renderData == null) {
      throw Error(`No render data assigned for track: ${this.label}`);
    }

    const { bands, xRange } = this.renderData;

    const overlapInfo = getOverlapInfo(
      bands.sort((b1, b2) => (b1.start <= b2.start ? -1 : 1)),
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

    const dimensions = super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    const yScale = getYScale(
      STYLE.bandTrack.trackPadding,
      STYLE.bandTrack.bandPadding,
      this.expanded ? numberTracks : 1,
      dimensions.height,
    );

    const scaledBands: RenderBand[] = bands.map((band) => {
      const scaledBand = Object.create(band);
      const bandNOverlap = overlapInfo[band.id].lane;
      let yRange = yScale(bandNOverlap, this.expanded);
      scaledBand.y1 = yRange[0];
      scaledBand.y2 = yRange[1];
      scaledBand.edgeColor = STYLE.bandTrack.edgeColor;
      return scaledBand;
    });

    this.hoverTargets = getBoundBoxes(scaledBands, xScale);

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

function getBoundBoxes(bands, xScale: Scale) {
  return bands.map((band) => {
    return {
      label: band.label,
      x1: xScale(band.start),
      x2: xScale(band.end),
      y1: band.y1,
      y2: band.y2,
    };
  });
}

function getTrackHeight(
  trackHeight: number,
  numberTracks: number,
  trackPadding: number,
  bandPadding: number,
): number {
  const singleBandHeight = trackHeight - (trackPadding + bandPadding) * 2;
  const multiTrackHeight =
    trackPadding * 2 + (singleBandHeight + bandPadding * 2) * numberTracks;
  return multiTrackHeight;
}

customElements.define("band-track", BandTrack);
