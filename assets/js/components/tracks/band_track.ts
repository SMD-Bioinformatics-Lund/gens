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
    super.initializeCanvas(label, trackHeight);
    this.initializeTooltip();
    this.initializeExpander(trackHeight);
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
    // const { bands: adjustedBands, numberLanes } = calculateBands(
    //   bands,
    //   dimensions.height,
    //   this.dimensions.height,
    // );

    const {numberLanes, bandOverlaps} = getOverlapInfo(bands);

    const yScale = getBandYScale(
      STYLE.bandTrack.trackPadding,
      STYLE.bandTrack.bandPadding,
      this.isExpanded() ? numberLanes : 1,
      this.dimensions.height,
    );
  
  
    const scaledBands: RenderBand[] = bands.map((band) => {
      const scaledBand = Object.create(band);
      if (bandOverlaps[band.id] == null) {
        throw Error(`Missing ID: ${band.id}`);
      }
      const bandNOverlap = bandOverlaps[band.id].lane;
      let yRange = yScale(bandNOverlap, this.isExpanded());
      scaledBand.y1 = yRange[0];
      scaledBand.y2 = yRange[1];
      scaledBand.edgeColor = STYLE.bandTrack.edgeColor;
      return scaledBand;
    });

    this.setExpandedHeight(numberLanes);

    renderBorder(this.ctx, dimensions, STYLE.tracks.edgeColor);
    renderBands(this.ctx, scaledBands, xScale);
    this.hoverTargets = getBoundBoxes(scaledBands, xScale);
  }

  setExpandedHeight(numberLanes: number) {
    if (this.isExpanded()) {
      const style = STYLE.bandTrack;
      const expandedHeight = getTrackHeight(
        style.trackHeight.thin,
        numberLanes,
        style.trackPadding,
        style.bandPadding,
      );
      super.setExpandedHeight(expandedHeight);
    }
  }
}

customElements.define("band-track", BandTrack);
