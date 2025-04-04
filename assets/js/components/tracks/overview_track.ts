import { drawVerticalLine } from "../../draw/shapes";
import { transformMap, padRange, rangeSize } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import { drawDotsScaled, linearScale, renderBorder, scaleToPixels } from "./render_utils";

const X_PAD = 5;
const DOT_SIZE = 2;

export class OverviewTrack extends CanvasTrack {
  totalChromSize: number;
  chromSizes: Record<string, number>;
  marker: HTMLDivElement;
  onChromosomeClick: (chrom: string) => void;

  renderData: Record<string, RenderDot[]> | null = null;
  pxRanges: Record<string, Rng> = {};

  initialize(
    label: string,
    trackHeight: number,
    chromSizes: Record<string, number>,
    onChromosomeClick: (chrom: string) => void,
  ) {
    super.initializeCanvas(label, trackHeight);
    this.chromSizes = chromSizes;

    const marker = document.createElement("div") as HTMLDivElement;
    marker.style.height = `${this.dimensions.height}px`;
    marker.style.width = "0px";
    marker.style.backgroundColor = STYLE.colors.transparentYellow;
    marker.style.position = "absolute";
    marker.style.top = "0px";
    this.trackContainer.appendChild(marker);
    this.marker = marker;

    this.onChromosomeClick = onChromosomeClick;

    this.canvas.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      const chrom = pixelToChrom(event.offsetX, this.pxRanges);
      this.onChromosomeClick(chrom);
    });
  }

  render(
    viewRegion: Region | null,
    dotsPerChrom: Record<string, RenderDot[]>,
    yRange: [number, number],
  ) {
    super.syncDimensions();

    renderBorder(this.ctx, this.dimensions);

    const totalChromSize = Object.values(this.chromSizes).reduce(
      (tot, size) => tot + size,
      0,
    );

    const xScale = (pos: number) => {
      return linearScale(pos, [0, totalChromSize], [0, this.dimensions.width]);
    };

    const yScale = (pos: number) => {
      return linearScale(pos, yRange, [0, this.dimensions.height]);
    };

    const chromRanges = getChromRanges(this.chromSizes);
    this.pxRanges = transformMap(
      chromRanges,
      ([start, end]) => [xScale(start), xScale(end)],
    );

    renderOverviewPlot(
      this.ctx,
      chromRanges,
      this.pxRanges,
      xScale,
      yScale,
      dotsPerChrom,
      this.chromSizes
    );

    if (viewRegion !== null) {
      // const chromPxRange = this.pxRanges[viewRegion.chrom];
      const chromStartPos = chromRanges[viewRegion.chrom][0];
      const viewPxRange: Rng = [
        xScale(viewRegion.start + chromStartPos),
        xScale(viewRegion.end + chromStartPos)
      ];
      const markerWidth = rangeSize(viewPxRange);

      this.marker.style.height = `${this.dimensions.height}px`;
      this.marker.style.width = `${markerWidth}px`;
      this.marker.style.left = `${viewPxRange[0]}px`;
    }
  }
}

function renderOverviewPlot(
  ctx: CanvasRenderingContext2D,
  chromRanges: Record<string, Rng>,
  pxRanges: Record<string, Rng>,
  xScale: Scale,
  yScale: Scale,
  dotsPerChrom: Record<string, RenderDot[]>,
  chromSizes: Record<string, number>
) {
  // Draw the initial lines
  Object.values(chromRanges).forEach(([_chromStart, chromEnd]) =>
    drawVerticalLine(ctx, chromEnd, xScale),
  );

  Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {
    const pad = X_PAD;
    const pxRange = padRange(pxRanges[chrom], pad);

    const chromXScale = (pos: number) => {
      return linearScale(pos, [0, chromSizes[chrom]], pxRange);
    };

    drawDotsScaled(ctx, dotData, chromXScale, yScale, DOT_SIZE);
  });
}

function pixelToChrom(xPixel: number, pxRanges: Record<string, Rng>): string {
  for (const [chrom, range] of Object.entries(pxRanges)) {
    if (xPixel >= range[0] && xPixel < range[1]) {
      return chrom;
    }
  }
  throw Error(
    `Something went wrong, no chromosome range matched position: ${xPixel}`,
  );
}

function getChromRanges(
  chromSizes: Record<string, number>,
): Record<string, [number, number]> {
  const chromRanges: Record<string, [number, number]> = {};
  let sumPos = 0;
  Object.entries(chromSizes).forEach(([chrom, chromLength]) => {
    const startPos = sumPos;
    sumPos += chromLength;

    const posRange: Rng = [startPos, sumPos];
    // const pxRange = posRange.map((pos) =>
    //     scaleToPixels(pos, totalChromSize, screenWidth),
    // ) as [number, number];

    chromRanges[chrom] = posRange;
  });
  return chromRanges;
}

function drawSegmentDots(dots: RenderDot[], pxRange: [number, number]) {}

// This will actually be multiple parts
function additionalText() {}

customElements.define("overview-track", OverviewTrack);
