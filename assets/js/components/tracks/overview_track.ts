import { drawVerticalLine } from "../../draw/shapes";
import { transformMap, padRange, rangeSize } from "../../track/utils";
import { CanvasTrack } from "./canvas_track";
import { drawDotsScaled, linearScale, renderBorder } from "./render_utils";

const X_PAD = 5;
const DOT_SIZE = 2;

export class OverviewTrack extends CanvasTrack {
  totalChromSize: number;
  chromSizes: Record<string, number>;

  initialize(
    label: string,
    trackHeight: number,
    chromSizes: Record<string, number>,
  ) {
    super.initializeCanvas(label, trackHeight);
    this.chromSizes = chromSizes;
  }

  // What are the inputs?
  render(
    selectedChrom: string | null,
    dotsPerChrom: Record<string, RenderDot[]>,
    yRange: [number, number],
    onChromosomeClick: (chrom: string) => void,
  ) {
    super.syncDimensions();

    const totalChromSize = Object.values(this.chromSizes).reduce(
      (tot, size) => tot + size,
      0,
    );

    renderBorder(this.ctx, this.dimensions);

    const xScale = (pos: number) => {
      return linearScale(pos, [0, totalChromSize], [0, this.dimensions.width]);
    };

    const yScale = (pos: number) => {
      return linearScale(pos, yRange, [0, this.dimensions.height]);
    };

    const chromRanges = getChromRanges(this.chromSizes);
    // Draw the initial lines
    Object.values(chromRanges).forEach(([_chromStart, chromEnd]) =>
      drawVerticalLine(this.ctx, chromEnd, xScale),
    );

    const pxRanges: Record<string, Rng> = transformMap(
      chromRanges,
      ([start, end]) => [xScale(start), xScale(end)],
    );

    Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {
      const pad = X_PAD;
      const pxRange = padRange(pxRanges[chrom], pad);

      const chromXScale = (pos: number) => {
        return linearScale(pos, [0, this.chromSizes[chrom]], pxRange);
      };

      drawDotsScaled(this.ctx, dotData, chromXScale, yScale, DOT_SIZE);
    });

    this.canvas.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      const chrom = pixelToChrom(event.offsetX, pxRanges);
      onChromosomeClick(chrom);
    });
  }
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
