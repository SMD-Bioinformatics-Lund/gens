import { drawBox, drawLabel, drawLine } from "../../draw/shapes";
import { transformMap, padRange, generateID } from "../../util/utils";
import { COLORS, SIZES, STYLE, TRANSPARENCY } from "../../constants";
import { CanvasTrack, CanvasTrackSettings } from "./base_tracks/canvas_track";
import {
  drawDotsScaled,
  getLinearScale,
  linearScale,
  renderBackground,
} from "../../draw/render_utils";
import { GensMarker } from "../../movements/marker";
import { renderYAxis } from "./base_tracks/data_track";

const X_PAD = 5;
const DOT_SIZE = 2;
const PIXEL_RATIO = 2;

export class OverviewTrack extends CanvasTrack {
  totalChromSize: number;
  chromSizes: Record<string, number>;
  marker: GensMarker;
  onChromosomeClick: (chrom: string) => void;
  yRange: Rng;
  yAxis: Axis;

  pxRanges: Record<string, Rng> = {};

  renderData: OverviewTrackData | null;
  getRenderData: () => Promise<OverviewTrackData>;
  getRegion: () => Region;

  // FIXME: Temporary solution to make sure the overview plots are rendered
  // efficiently. This should likely be generalized and part of Canvas track.
  private staticBuffer: HTMLCanvasElement;
  private staticCtx: CanvasRenderingContext2D;
  private drawLabels: boolean;

  constructor(
    id: string,
    label: string,
    settings: CanvasTrackSettings,
    chromSizes: Record<string, number>,
    onChromosomeClick: (chrom: string) => void,
    yRange: Rng,
    getRenderData: () => Promise<OverviewTrackData>,
    getRegion: () => Region,
    drawLabels: boolean,
    yAxis: Axis,
  ) {
    super(id, label, settings);

    this.chromSizes = chromSizes;
    this.yRange = yRange;
    this.getRenderData = getRenderData;
    this.getRegion = getRegion;
    this.onChromosomeClick = onChromosomeClick;
    this.drawLabels = drawLabels;
    this.yAxis = yAxis;

    this.staticBuffer = document.createElement("canvas");
    this.staticCtx = this.staticBuffer.getContext("2d");
  }

  initialize() {
    super.initialize();

    this.marker = document.createElement("gens-marker") as GensMarker;
    const id = generateID();
    this.marker.initialize(
      id,
      this.dimensions.height,
      { color: COLORS.transparentYellow, isCreated: true },
      null,
    );

    this.trackContainer.appendChild(this.marker);

    this.canvas.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      const chrom = pixelToChrom(event.offsetX, this.pxRanges);
      if (chrom == null) {
        return;
      }
      this.onChromosomeClick(chrom);
    });

    this.addElementListener(
      this.trackContainer,
      "mousemove",
      (event: MouseEvent) => {
        this.trackContainer.style.cursor =
          event.offsetX > STYLE.yAxis.width ? "pointer" : "";
      },
    );

    this.trackContainer.style.borderRight = `${SIZES.one}px solid ${COLORS.lightGray}`;
  }

  async render(settings: RenderSettings) {
    const firstTime = this.renderData == null;
    const dataChanged = firstTime || settings.reloadData;
    const sizeChanged = firstTime || settings.resized;

    if (dataChanged) {
      this.renderData = await this.getRenderData();
    }

    super.syncDimensions();

    const region = this.getRegion();
    const metrics = calculateMetrics(
      region,
      this.chromSizes,
      this.dimensions,
      this.drawLabels,
      this.yRange,
    );

    this.pxRanges = metrics.pxRanges;

    if (sizeChanged || settings.mainSampleChanged) {
      this.staticBuffer.width = this.dimensions.width * PIXEL_RATIO;
      this.staticBuffer.height = this.dimensions.height * PIXEL_RATIO;
      this.staticCtx.resetTransform();
      this.staticCtx.scale(PIXEL_RATIO, PIXEL_RATIO);
      renderBackground(this.staticCtx, this.dimensions, STYLE.tracks.edgeColor);
      renderOverviewPlot(
        this.staticCtx,
        this.pxRanges,
        metrics.yScale,
        this.yRange,
        this.renderData.dotsPerChrom,
        this.chromSizes,
        this.drawLabels,
        this.dimensions,
        this.yAxis,
      );
    }

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

    this.marker.render(metrics.viewPxRange);

    const shiftRight = STYLE.yAxis.width + SIZES.xxs;
    const shiftDown = STYLE.overviewTrack.titleSpace + SIZES.xxs;
    drawLabel(
      this.ctx,
      this.renderData.sampleLabel,
      STYLE.tracks.textPadding + shiftRight,
      STYLE.tracks.textPadding + shiftDown,
      {
        textBaseline: "top",
        boxStyle: { fillColor: `${COLORS.white}${TRANSPARENCY.s}` },
      },
    );
  }
}

function calculateMetrics(
  region: Region,
  chromSizes: Record<string, number>,
  dim: Dimensions,
  drawLabels: boolean,
  yRange: Rng,
): {
  xRange: Rng;
  xScale: Scale;
  yScale: Scale;
  chromRanges: Record<string, Rng>;
  viewPxRange: Rng;
  chromStartPos: number;
  pxRanges: Record<string, Rng>;
} {
  const totalChromSize = Object.values(chromSizes).reduce(
    (tot, size) => tot + size,
    0,
  );
  const xScale = (pos: number) => {
    return linearScale(
      pos,
      [0, totalChromSize],
      [STYLE.yAxis.width, dim.width],
    );
  };
  const chromRanges = getChromRanges(chromSizes);
  const pxRanges: Record<string, Rng> = transformMap(
    chromRanges,
    ([start, end]) => [xScale(start), xScale(end)],
  );

  const xRange: Rng = [region.start, region.end];

  const chromStartPos = chromRanges[region.chrom][0];
  const viewPxRange: Rng = [
    xScale(xRange[0] + chromStartPos),
    xScale(xRange[1] + chromStartPos),
  ];

  const yPadding = drawLabels ? STYLE.overviewTrack.titleSpace : 0;
  const reversed = true;
  const yScale = getLinearScale(yRange, [yPadding, dim.height], reversed);

  return {
    xRange,
    xScale,
    yScale,
    chromRanges,
    viewPxRange,
    chromStartPos,
    pxRanges,
  };
}

function renderOverviewPlot(
  ctx: CanvasRenderingContext2D,
  pxRanges: Record<string, Rng>,
  yScale: Scale,
  yRange: Rng,
  dotsPerChrom: Record<string, RenderDot[]>,
  chromSizes: Record<string, number>,
  drawLabels: boolean,
  dimensions: Dimensions,
  yAxis: Axis,
) {
  // Draw the y axis
  drawBox(
    ctx,
    { x1: 0, x2: STYLE.yAxis.width, y1: 0, y2: dimensions.height },
    { fillColor: COLORS.extraLightGray },
  );
  renderYAxis(ctx, yAxis, yScale, dimensions, {
    isExpanded: true,
  });

  // Draw the initial lines
  Object.values(pxRanges).forEach(([_chromPxStart, chromPxEnd]) => {
    drawLine(
      ctx,
      { x1: chromPxEnd, x2: chromPxEnd, y1: 0, y2: dimensions.height },
      { color: COLORS.lightGray },
    );
  });

  Object.entries(dotsPerChrom).forEach(([chrom, dotData]) => {
    const pad = X_PAD;
    const chromRangePx = pxRanges[chrom];
    const pxRange = padRange(chromRangePx, pad);

    const chromXScale = (pos: number) => {
      return linearScale(pos, [1, chromSizes[chrom]], pxRange);
    };

    if (drawLabels) {
      const renderChrom = `${chrom}`;
      drawLabel(
        ctx,
        renderChrom,
        (pxRange[0] + pxRange[1]) / 2,
        STYLE.overviewTrack.labelPad,
        {
          textAlign: "center",
        },
      );
    }

    // FIXME: The coloring should probably be done here directly
    // Not in the data generation step
    const coloredDotsInRange = dotData.map((dot) => {
      const copy = { ...dot, color: STYLE.colors.black };
      if (dot.y < yRange[0]) {
        copy.y = yRange[0];
        copy.color = STYLE.colors.red;
      } else if (dot.y > yRange[1]) {
        copy.y = yRange[1];
        copy.color = STYLE.colors.red;
      }
      return copy;
    });
    drawDotsScaled(ctx, coloredDotsInRange, chromXScale, yScale, {
      size: DOT_SIZE,
    });
  });
}

function pixelToChrom(
  xPixel: number,
  pxRanges: Record<string, Rng>,
): string | null {
  if (xPixel < pxRanges["1"][0]) {
    return null;
  }
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
