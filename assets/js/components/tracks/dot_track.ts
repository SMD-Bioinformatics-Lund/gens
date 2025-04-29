import { drawHorizontalLineInScale } from "../../draw/shapes";
import { COLORS, STYLE } from "../../constants";
import { CanvasTrack } from "./canvas_track/canvas_track";
import {
  drawDotsScaled,
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../draw/render_utils";
import {
  createMarker,
  initializeDragSelect,
  renderMarkerRange,
} from "./canvas_track/interactive_tools";
import { keyLogger } from "../util/keylogger";
import { scaleRange } from "../../util/utils";

export class DotTrack extends CanvasTrack {
  renderData: DotTrackData | null;
  getRenderData: () => Promise<DotTrackData>;
  yRange: Rng;
  xRange: Rng | null = null;
  xScale: Scale | null = null;
  yTicks: number[];
  onZoomIn: (xRange: Rng) => void;
  onZoomOut: () => void;

  getHighlights: (() => Rng[]) | null;
  existingHighlights: Rng[] = [];

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    yRange: Rng,
    yTicks: number[],
    getRenderData: () => Promise<DotTrackData>,
    onZoomIn: (xRange: Rng) => void,
    onZoomOut: () => void,
    getHighlights: (() => Rng[]) | null,
  ) {
    super(id, label, trackHeight);
    this.getRenderData = getRenderData;
    this.yRange = yRange;
    this.yTicks = yTicks;
    this.onZoomIn = onZoomIn;
    this.onZoomOut = onZoomOut;
    this.getHighlights = getHighlights;
  }

  initialize() {
    super.initialize();
    const startExpanded = true;
    const onExpand = () => this.render(false);
    this.initializeExpander("contextmenu", startExpanded, onExpand);
    this.setExpandedHeight(this.defaultTrackHeight * 2);

    initializeDragSelect(this.canvas, (pxRangeX: Rng, _pxRangeY: Rng) => {
      if (this.xRange == null) {
        console.error("No xRange set");
      }

      const yAxisWidth = STYLE.yAxis.width;

      const pixelToPos = getLinearScale(
        [yAxisWidth, this.dimensions.width],
        this.xRange,
      );
      const posStart = Math.max(0, pixelToPos(pxRangeX[0]));
      const posEnd = pixelToPos(pxRangeX[1]);

      this.onZoomIn([Math.floor(posStart), Math.floor(posEnd)]);
    });

    this.trackContainer.addEventListener("click", () => {
      console.log("Click registered");
      if (keyLogger.heldKeys.Control) {
        console.log("Attempting to zoom out");
        this.onZoomOut();
      }
    });
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderLoading();
      this.renderData = await this.getRenderData();
    }

    const { xRange, dots } = this.renderData;
    this.xRange = xRange;
    const yRange = this.yRange;

    const dotsInRange = dots.filter(
      (dot) => dot.x >= xRange[0] && dot.y <= xRange[1],
    );

    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const yAxisWidth = STYLE.yAxis.width;
    const xScale = getLinearScale(xRange, [yAxisWidth, dimensions.width]);
    this.xScale = xScale;
    const yScale = getLinearScale(yRange, [0, dimensions.height]);

    for (const yTick of this.yTicks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }

    drawDotsScaled(this.ctx, dotsInRange, xScale, yScale);
    drawYAxis(this.ctx, this.yTicks, yScale, yRange);
    this.drawTrackLabel(yAxisWidth);

    if (this.getHighlights != null) {
      this.existingHighlights = renderHighlights(
        this.trackContainer,
        this.dimensions.height,
        this.existingHighlights,
        this.getHighlights(),
        xScale,
      );
    }
  }
}

// FIXME: We need a highlight class
// FIXME: We also need to simplify this
function renderHighlights(
  container: HTMLDivElement,
  height: number,
  existingHighlights: Rng[],
  highlights: Rng[],
  xScale: Scale,
): Rng[] {
  const newHighlights: Rng[] = [];

  const existingFingerprints = new Set(
    existingHighlights.map((hl) => `${hl[0]}_${hl[1]}`),
  );

  for (const highlight of highlights) {
    const fp = `${highlight[0]}_${highlight[1]}`;
    if (!existingFingerprints.has(fp)) {
      newHighlights.push(highlight);
    }
  }

  for (const hl of newHighlights) {
    console.log("Action goes here");

    const marker = createMarker(height, COLORS.transparentBlue);
    container.appendChild(marker);

    const hlPx = scaleRange(hl, xScale);

    console.log("Range before", hl, "Range after scaling", hlPx);

    renderMarkerRange(marker, hlPx, height);
  }

  const allHighlights = [];
  for (const hl of existingHighlights) {
    allHighlights.push(hl);
  }
  for (const hl of newHighlights) {
    allHighlights.push(hl);
  }

  return allHighlights;
}

customElements.define("dot-track", DotTrack);
