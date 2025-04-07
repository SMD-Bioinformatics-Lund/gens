import { getNOverlaps } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
  renderData: {
    xRange: Rng;
    bands: RenderBand[];
    settings: { bandHeight: number | null };
  } | null;

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
    settings: { bandHeight: number | null };
  }) {
    this.renderData = renderData;
  }

  render() {
    if (this.renderData == null) {
      throw Error("No render data assigned")
    }

    const { bands, xRange, settings } = this.renderData;

    // this.canvas.height = 300;
    const dimensions = super.syncDimensions();

    // FIXME: We should keep those stretching over the full screen
    let bandsWithinRange = bands.filter(
      (annot) => annot.start > xRange[0] && annot.end <= xRange[1],
    );

    bandsWithinRange = bandsWithinRange.sort((band1, band2) =>
      band1.start < band2.start ? -1 : 1,
    );

    const nOverlaps = getNOverlaps(bandsWithinRange);

    // Hover
    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    // FIXME: Break out method
    // FIXME: How to deal with y position for bands?
    let y1;
    let y2;
    if (settings.bandHeight != null) {
      const remainder = this.dimensions.height - settings.bandHeight;
      y1 = remainder / 2;
      y2 = this.dimensions.height - remainder / 2;
    } else {
      y1 = 0;
      y2 = this.dimensions.height;
    }

    const shift = 5;
    const scaledBands = bandsWithinRange.map((band, i) => {
      const scaledBand = Object.create(band);
      scaledBand.y1 = y1 + shift * nOverlaps[i];
      scaledBand.y2 = y2 + shift * nOverlaps[i];
      return scaledBand;
    });

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

    // this.renderTooltip(annotWithinRange, xScale, this.dimensions);
  }
}

customElements.define("band-track", BandTrack);
