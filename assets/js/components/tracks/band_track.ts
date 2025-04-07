import { getNOverlaps } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
  renderData: BandTrackData | null;
  // FIXME: Should this be calculated outside the track?
  processedRenderData: {
    bands: RenderBand[];
    maxOverlap: number,
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
    const { bands, xRange, settings } = this.renderData;

    // FIXME: We should keep those stretching over the full screen
    const bandsToRender = bands
      .filter((annot) => annot.start > xRange[0] && annot.end <= xRange[1])
      .sort((band1, band2) => (band1.start < band2.start ? -1 : 1));

    const nOverlap = getNOverlaps(bandsToRender);
    const maxOverlap = Math.max(...Object.values(nOverlap));

    console.log(`Max overlaps ${maxOverlap} for label ${this.label}`);

    this.processedRenderData = {
      bands: bandsToRender,
      maxOverlap,
      nPriorBandOverlaps: nOverlap,
    };
  }

  render() {
    console.log("Band render called");
    if (this.renderData == null) {
      throw Error(`No render data assigned for track: ${this.label}`);
    }

    const { xRange, settings } = this.renderData;
    const { bands, nPriorBandOverlaps: nOverlap, maxOverlap } = this.processedRenderData;

    if (this.expanded) {
      const assignedHeight = 30 * (maxOverlap + 1);
      console.log("Assigning height", assignedHeight);
      this.assignedHeight = assignedHeight;
    }

    const dimensions = super.syncDimensions();

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    // FIXME: Expand to include all data?

    const getBandYRange = (pos: number) => {
      const renderingArea = this.dimensions.height - settings.bandPad * 2;
      const numberTracks = this.expanded ? 5 : 1;
      const trackHeight = renderingArea / numberTracks;

      let yShift = 0;
      if (this.expanded) {
        yShift = pos * trackHeight;
      }
      const y1 = settings.bandPad + yShift;
      const y2 = settings.bandPad + yShift + trackHeight;

      return [y1, y2];
    };

    // FIXME: Verify - is it working correctly
    // Looking a bit strange sometimes for multiple stacked tracks
    const scaledBands: RenderBand[] = bands.map((band) => {
      const scaledBand = Object.create(band);
      const bandNOverlap = nOverlap[band.id];
      let yRange = getBandYRange(bandNOverlap);
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

customElements.define("band-track", BandTrack);
