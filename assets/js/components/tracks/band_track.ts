import { getNOverlaps } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import { getLinearScale, renderBands, renderBorder, shiftOverlappingBands } from "./render_utils";

export class BandTrack extends CanvasTrack {
  renderData: BandTrackData | null;

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
    console.log("Band render called");
    if (this.renderData == null) {
      throw Error(`No render data assigned for track: ${this.label}`)
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

    // const nOverlaps = getNOverlaps(bandsWithinRange);

    // // Hover
    // const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    // // FIXME: Break out method
    // // FIXME: How to deal with y position for bands?
    // let y1;
    // let y2;
    // if (settings.bandHeight != null) {
    //   const remainder = this.dimensions.height - settings.bandHeight;
    //   y1 = remainder / 2;
    //   y2 = this.dimensions.height - remainder / 2;
    // } else {
    //   y1 = 0;
    //   y2 = this.dimensions.height;
    // }

    // const shift = 5;
    // const scaledBands = bandsWithinRange.map((band, i) => {
    //   const scaledBand = Object.create(band);
    //   scaledBand.y1 = y1 + shift * nOverlaps[i];
    //   scaledBand.y2 = y2 + shift * nOverlaps[i];
    //   return scaledBand;
    // });

    const xScale = getLinearScale(xRange, [0, this.dimensions.width]);

    const getBandYRange = (pos: number) => {
      const renderingArea = this.dimensions.height - settings.bandPad * 2;
      const numberTracks = this.expanded ? 5 : 1;
      const trackHeight = renderingArea / numberTracks;

      let yShift = 0;
      if (this.expanded) {
        yShift = pos * trackHeight
      }
      const y1 = settings.bandPad + yShift;
      const y2 = settings.bandPad + yShift + trackHeight;

      return [y1, y2];
    }

    const nOverlaps = getNOverlaps(bandsWithinRange);

    const scaledBands: RenderBand[] = bandsWithinRange.map((band) => {
      const scaledBand = Object.create(band);
      const nOverlap = nOverlaps[band.id];
      let yRange = getBandYRange(nOverlap);
      scaledBand.y1 = yRange[0];
      scaledBand.y2 = yRange[1];
      return scaledBand;
    })

    // let yScale: (id: string) => Rng;
    // if (this.expanded) {
    //   const nOverlaps = getNOverlaps(bandsWithinRange);
    //   yScale = (id: string) => {
    //     const nOverlap = nOverlaps[id];
    //     const y1 = 
    //   }
    // } else {
    //   yScale = (_id: string) => {
    //     const remainder = this.dimensions.height - settings.topBottomPadding;
    //     const y1 = remainder / 2;
    //     const y2 = this.dimensions.height - remainder / 2;
    //     return [y1, y2];
    //   }
    // }

    // const scaledBands = shiftOverlappingBands(bandsWithinRange, xScale)

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

    // this.renderTooltip(annotWithinRange, xScale, this.dimensions);
  }
}

customElements.define("band-track", BandTrack);
