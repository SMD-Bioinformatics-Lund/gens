import { getOverlapInfo, getTrackHeight } from "../../track/expand_track_utils";
import { getBandYScale, getBoundBoxes } from "../../track/utils";
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
    const expandable = true;
    super.initializeCanvas(label, trackHeight, expandable);
    this.initializeTooltip();
    this.getRenderData = getRenderData;
  }

  async render(updateData: boolean) {
    if (this.getRenderData == undefined) {
      throw Error(`No getRenderData set up for track, must initialize first`);
    }

    if (updateData || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    const { bands, xRange } = this.renderData;

    const dimensions = super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);
    const { bands: adjustedBands, numberLanes } = calculateBands(
      bands,
      dimensions.height,
      this.dimensions.height,
    );

    if (this.expanded) {
      const style = STYLE.bandTrack;
      const expandedHeight = getTrackHeight(
        style.trackHeight.thin,
        numberLanes,
        style.trackPadding,
        style.bandPadding,
      );

      this.assignedHeight = expandedHeight;
    }

    renderBorder(this.ctx, dimensions, STYLE.tracks.edgeColor);
    renderBands(this.ctx, adjustedBands, xScale);
    this.hoverTargets = getBoundBoxes(adjustedBands, xScale);
  }
}

export function calculateBands(
  bands: RenderBand[],
  numberTracks: number,
  canvasHeight: number,
): { bands: RenderBand[]; numberLanes: number } {
  const yScale = getBandYScale(
    STYLE.bandTrack.trackPadding,
    STYLE.bandTrack.bandPadding,
    this.expanded ? numberTracks : 1,
    canvasHeight,
  );

  const overlapInfo = getOverlapInfo(bands);

  const scaledBands: RenderBand[] = bands.map((band) => {
    const scaledBand = Object.create(band);
    const bandNOverlap = overlapInfo[band.id].lane;
    let yRange = yScale(bandNOverlap, this.expanded);
    scaledBand.y1 = yRange[0];
    scaledBand.y2 = yRange[1];
    scaledBand.edgeColor = STYLE.bandTrack.edgeColor;
    return scaledBand;
  });

  return { bands: scaledBands, numberLanes: overlapInfo.numberLanes };
}

customElements.define("band-track", BandTrack);
