import { CanvasTrack } from "./canvas_track";
import { renderBands, renderBorder } from "./render_utils";

export class BandTrack extends CanvasTrack {
  initialize(label: string, trackHeight: number) {
    super.initializeCanvas(label, trackHeight);
    this.initializeTooltip();
  }

  render(
    xRange: [number, number],
    bands: RenderBand[],
    settings: { bandHeight: number | null } = { bandHeight: null },
  ) {
    const dimensions = super.syncDimensions();

    const bandsWithinRange = bands.filter(
      (annot) => annot.start >= xRange[0] && annot.end <= xRange[1],
    );

    // Hover
    const xScale = this.getScale(xRange, "x");

    // const noMatchColor = "black";
    // // const exceededColor = "gray";
    // const colorPool = ["red", "blue", "green", "orange"];
    // const allLevels = [...new Set(annotations.map(annot => annot.label))];
    // const colorScale = this.getColorScale(allLevels, colorPool, noMatchColor);

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

    console.log("Assigned y1 y2", y1, y2);

    const scaledBands = bandsWithinRange.map((band) => {
        const scaledBand = Object.create(band);
        scaledBand.y1 = y1;
        scaledBand.y2 = y2;
        return scaledBand;
    });

    this.hoverTargets = bands.map((band) => {
      return {
        label: band.label,
        x1: xScale(band.start),
        x2: xScale(band.end),
        y1,
        y2,
      };
    });

    renderBorder(this.ctx, dimensions);
    renderBands(this.ctx, scaledBands, xScale);

    // this.renderTooltip(annotWithinRange, xScale, this.dimensions);
  }
}

customElements.define("band-track", BandTrack);
