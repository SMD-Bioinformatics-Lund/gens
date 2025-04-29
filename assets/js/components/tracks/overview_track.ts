import { drawLabel, drawVerticalLineInScale } from "../../draw/shapes";
import { transformMap, padRange, rangeSize } from "../../util/utils";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track/canvas_track";
import {
  drawDotsScaled,
  linearScale,
  renderBackground,
} from "../../draw/render_utils";
import {
  createMarker,
  renderMarkerRange,
} from "./canvas_track/interactive_tools";

const X_PAD = 5;
const DOT_SIZE = 2;
const PIXEL_RATIO = 2;

export class OverviewTrack extends CanvasTrack {
  totalChromSize: number;
  chromSizes: Record<string, number>;
  marker: HTMLDivElement;
  onChromosomeClick: (chrom: string) => void;
  yRange: Rng;

  pxRanges: Record<string, Rng> = {};
  isRendered: boolean;

  renderData: OverviewTrackData | null;
  getRenderData: () => Promise<OverviewTrackData>;

  // FIXME: Temporary solution to make sure the overview plots are rendered
  // efficiently. This should likely be generalized and part of Canvas track.
  private staticBuffer: HTMLCanvasElement;
  private staticCtx: CanvasRenderingContext2D;
  private drawLabels: boolean;

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    chromSizes: Record<string, number>,
    onChromosomeClick: (chrom: string) => void,
    yRange: Rng,
    getRenderData: () => Promise<OverviewTrackData>,
    drawLabels: boolean,
  ) {
    super(id, label, trackHeight);

    this.chromSizes = chromSizes;
    this.yRange = yRange;
    this.getRenderData = getRenderData;
    this.onChromosomeClick = onChromosomeClick;
    this.drawLabels = drawLabels;

    this.staticBuffer = document.createElement("canvas");
    this.staticCtx = this.staticBuffer.getContext("2d");
  }

  initialize() {
    super.initialize();

    const marker = createMarker(this.dimensions.height);
    this.trackContainer.appendChild(marker);
    this.marker = marker;

    this.canvas.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      const chrom = pixelToChrom(event.offsetX, this.pxRanges);
      this.onChromosomeClick(chrom);
    });

    this.trackContainer.style.cursor = "pointer";
  }

  async render(updateData: boolean) {
    let newRender = false;
    if (this.renderData == null || updateData) {
      this.renderData = await this.getRenderData();
      newRender = true;
    }

    const { xRange, chromosome, dotsPerChrom } = this.renderData;

    const totalChromSize = Object.values(this.chromSizes).reduce(
      (tot, size) => tot + size,
      0,
    );

    const xScale = (pos: number) => {
      return linearScale(pos, [0, totalChromSize], [0, this.dimensions.width]);
    };
    const yPadding = this.drawLabels ? STYLE.overviewTrack.titleSpace : 0;

    const yScale = (pos: number) => {
      return linearScale(pos, this.yRange, [yPadding, this.dimensions.height]);
    };

    const chromRanges = getChromRanges(this.chromSizes);
    this.pxRanges = transformMap(chromRanges, ([start, end]) => [
      xScale(start),
      xScale(end),
    ]);

    if (newRender) {
      super.syncDimensions();
      this.renderLoading();

      // Sync the static canvas sizes
      this.staticBuffer.width = this.dimensions.width * PIXEL_RATIO;
      this.staticBuffer.height = this.dimensions.height * PIXEL_RATIO;
      this.staticCtx.resetTransform();
      this.staticCtx.scale(PIXEL_RATIO, PIXEL_RATIO);

      renderBackground(this.staticCtx, this.dimensions, STYLE.tracks.edgeColor);
      renderOverviewPlot(
        this.staticCtx,
        chromRanges,
        this.pxRanges,
        xScale,
        yScale,
        dotsPerChrom,
        this.chromSizes,
        this.drawLabels,
      );

      this.isRendered = true;
    }

    // Render offscreen canvas to display canvas
    super.syncDimensions();
    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);
    this.ctx.drawImage(
      this.staticBuffer,
      0,
      0,
      this.staticBuffer.width,
      this.staticBuffer.height,
      0,
      0,
      this.dimensions.width,
      this.dimensions.height,
    );

    const chromStartPos = chromRanges[chromosome][0];
    const viewPxRange: Rng = [
      xScale(xRange[0] + chromStartPos),
      xScale(xRange[1] + chromStartPos),
    ];
    renderMarkerRange(this.marker, viewPxRange, this.dimensions.height);
  }
}

function renderOverviewPlot(
  ctx: CanvasRenderingContext2D,
  chromRanges: Record<string, Rng>,
  pxRanges: Record<string, Rng>,
  xScale: Scale,
  yScale: Scale,
  dotsPerChrom: Record<string, RenderDot[]>,
  chromSizes: Record<string, number>,
  drawLabels: boolean,
) {
  // Draw the initial lines
  Object.values(chromRanges).forEach(([_chromStart, chromEnd]) =>
    drawVerticalLineInScale(ctx, chromEnd, xScale, {
      color: STYLE.tracks.edgeColor,
    }),
  );

  Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {
    const pad = X_PAD;
    const pxRange = padRange(pxRanges[chrom], pad);

    const chromXScale = (pos: number) => {
      return linearScale(pos, [0, chromSizes[chrom]], pxRange);
    };

    if (drawLabels) {
      drawLabel(
        ctx,
        chrom,
        (pxRange[0] + pxRange[1]) / 2,
        STYLE.overviewTrack.labelPad,
        {
          textAlign: "center",
        },
      );
    }

    // FIXME: The coloring should probably be done here directly
    // Not in the data generation step
    const coloredDots = dotData.map((dot) => {
      const copyDot = Object.create(dot);
      copyDot.color = STYLE.colors.darkGray;
      return copyDot;
    });
    drawDotsScaled(ctx, coloredDots, chromXScale, yScale, DOT_SIZE);
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

    chromRanges[chrom] = posRange;
  });
  return chromRanges;
}

customElements.define("overview-track", OverviewTrack);
