import { drawVerticalLine } from "../../draw/shapes";
import { transformMap, padRange, rangeSize } from "../../track/utils";
import { STYLE } from "../../util/constants";
import { CanvasTrack } from "./canvas_track";
import {
  drawDotsScaled,
  linearScale,
  renderBorder,
  scaleToPixels,
} from "./render_utils";

const X_PAD = 5;
const DOT_SIZE = 2;

export class OverviewTrack extends CanvasTrack {
  totalChromSize: number;
  chromSizes: Record<string, number>;
  marker: HTMLDivElement;
  onChromosomeClick: (chrom: string) => void;
  yRange: Rng;

  pxRanges: Record<string, Rng> = {};

  renderData: OverviewTrackData | null;
  getRenderData: () => Promise<OverviewTrackData>;

  async initialize(
    label: string,
    trackHeight: number,
    chromSizes: Record<string, number>,
    onChromosomeClick: (chrom: string) => void,
    yRange: Rng,
    getRenderData: () => Promise<OverviewTrackData>,
  ) {
    super.initializeCanvas(label, trackHeight);
    this.chromSizes = chromSizes;
    this.yRange = yRange;
    this.getRenderData = getRenderData;
    this.onChromosomeClick = onChromosomeClick;

    const marker = createChromMarker(
      this.dimensions.height,
      STYLE.colors.transparentYellow,
    );
    this.trackContainer.appendChild(marker);
    this.marker = marker;

    this.canvas.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      const chrom = pixelToChrom(event.offsetX, this.pxRanges);
      this.onChromosomeClick(chrom);
    });

    await this.updateRenderData();
  }

  async updateRenderData() {
    this.renderData = await this.getRenderData();
  }

  render() {
    if (this.renderData == null) {
      throw Error("No render data assigned");
    }

    super.syncDimensions();

    const { xRange, chromosome, dotsPerChrom } = this.renderData;

    renderBorder(this.ctx, this.dimensions);

    const totalChromSize = Object.values(this.chromSizes).reduce(
      (tot, size) => tot + size,
      0,
    );

    const xScale = (pos: number) => {
      return linearScale(pos, [0, totalChromSize], [0, this.dimensions.width]);
    };

    const yScale = (pos: number) => {
      return linearScale(pos, this.yRange, [0, this.dimensions.height]);
    };

    const chromRanges = getChromRanges(this.chromSizes);
    this.pxRanges = transformMap(chromRanges, ([start, end]) => [
      xScale(start),
      xScale(end),
    ]);

    renderOverviewPlot(
      this.ctx,
      chromRanges,
      this.pxRanges,
      xScale,
      yScale,
      dotsPerChrom,
      this.chromSizes,
    );

    const chromStartPos = chromRanges[chromosome][0];
    renderSelectedChromMarker(
      this.marker,
      xScale,
      xRange,
      chromStartPos,
      this.dimensions.height,
    );
  }
}

function createChromMarker(canvasHeight: number, color: string) {
  const marker = document.createElement("div") as HTMLDivElement;
  marker.style.height = `${canvasHeight}px`;
  marker.style.width = "0px";
  marker.style.backgroundColor = color;
  marker.style.position = "absolute";
  marker.style.top = "0px";
  return marker;
}

function renderSelectedChromMarker(
  marker: HTMLDivElement,
  xScale: Scale,
  xRange: Rng,
  chromStartPos: number,
  canvasHeight: number,
) {
  const viewPxRange: Rng = [
    xScale(xRange[0] + chromStartPos),
    xScale(xRange[1] + chromStartPos),
  ];
  const markerWidth = rangeSize(viewPxRange);

  marker.style.height = `${canvasHeight}px`;
  marker.style.width = `${markerWidth}px`;
  marker.style.left = `${viewPxRange[0]}px`;
}

function renderOverviewPlot(
  ctx: CanvasRenderingContext2D,
  chromRanges: Record<string, Rng>,
  pxRanges: Record<string, Rng>,
  xScale: Scale,
  yScale: Scale,
  dotsPerChrom: Record<string, RenderDot[]>,
  chromSizes: Record<string, number>,
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
