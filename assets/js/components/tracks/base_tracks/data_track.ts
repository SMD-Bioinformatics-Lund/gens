import { STYLE } from "../../../constants";
import {
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../../draw/render_utils";
import { drawHorizontalLineInScale, drawLabel } from "../../../draw/shapes";
import { generateID } from "../../../util/utils";
import { getCanvasClick, getCanvasHover } from "../../util/canvas_interaction";
import { keyLogger } from "../../util/keylogger";
import { CanvasTrack } from "./canvas_track";
import { initializeDragSelect, renderHighlights } from "./interactive_tools";

import debounce from "lodash.debounce";

interface Settings {
  defaultHeight: number;
  dragSelect: boolean;
  yAxis: {
    range: Rng;
    ticks: number[];
  } | null;
}

const DEBOUNCE_DELAY = 500;

export class DataTrack extends CanvasTrack {
  settings: Settings;
  getXRange: () => Rng;
  getXScale: () => Scale;
  getYRange: () => Rng;
  getYScale: () => Scale;
  dragCallbacks: DragCallbacks;
  openTrackContextMenu: (track: DataTrack) => void;

  isHidden: boolean = false;
  private isCollapsed: boolean = false;
  private expander: Expander;

  renderData: BandTrackData | DotTrackData | null;
  getRenderData: () => Promise<BandTrackData | DotTrackData>;

  private _renderSeq = 0;

  isExpanded(): boolean {
    return this.expander.isExpanded;
  }

  getIsCollapsed(): boolean {
    return this.isCollapsed;
  }

  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    this.currentHeight = this.expander.isExpanded
      ? this.expander.expandedHeight
      : this.isCollapsed
        ? this.collapsedTrackHeight
        : this.defaultTrackHeight;
  }

  // FIXME: Simplify the height management
  initializeExpander(
    eventKey: string,
    startExpanded: boolean,
    onExpand: () => void,
  ) {
    this.expander = new Expander(startExpanded);
    const height = this.isCollapsed
      ? this.collapsedTrackHeight
      : this.defaultTrackHeight;

    this.trackContainer.addEventListener(eventKey, (event) => {
      event.preventDefault();
      this.expander.toggle();
      this.currentHeight = this.expander.isExpanded
        ? this.expander.expandedHeight
        : height;
      this.syncDimensions();
      onExpand();
    });
  }

  constructor(
    id: string,
    label: string,
    getXRange: () => Rng,
    getXScale: () => Scale,
    callbacks: DragCallbacks,
    openTrackContextMenu: (track: DataTrack) => void,
    settings: Settings,
  ) {
    super(id, label, settings.defaultHeight);
    this.dragCallbacks = callbacks;
    this.settings = settings;
    this.getXRange = getXRange;
    this.getXScale = getXScale;

    this.getYRange = () => {
      return settings.yAxis.range;
    };
    this.getYScale = () => {
      const yRange = this.getYRange();
      const yScale = getLinearScale(yRange, [0, this.dimensions.height]);
      return yScale;
    };

    this.openTrackContextMenu = openTrackContextMenu;
  }

  initialize() {
    super.initialize();

    if (this.dragCallbacks != null) {
      this.setupDrag();
    }
  }

  setupDrag() {
    const onDrag = (pxRangeX: Rng, _pxRangeY: Rng, shiftPress: boolean) => {
      const xRange = this.getXRange();
      if (xRange == null) {
        console.error("No xRange set");
      }

      const yAxisWidth = STYLE.yAxis.width;

      const pixelToPos = getLinearScale(
        [yAxisWidth, this.dimensions.width],
        xRange,
      );
      const posStart = Math.max(0, pixelToPos(pxRangeX[0]));
      const posEnd = pixelToPos(pxRangeX[1]);

      if (shiftPress) {
        this.dragCallbacks.onZoomIn([Math.floor(posStart), Math.floor(posEnd)]);
      } else {
        const id = generateID();
        this.dragCallbacks.addHighlight(id, [posStart, posEnd]);
      }
    };

    initializeDragSelect(
      this.canvas,
      onDrag,
      this.dragCallbacks.removeHighlight,
    );

    this.trackContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        this.dragCallbacks.onZoomOut();
      }
    });
  }

  async render(updateData: boolean) {
    // The intent with the debounce keeping track of the rendering number (_renderSeq)
    // is to prevent repeated API requests when rapidly zooming/panning
    // Only the last request is of interest
    const _fetchData = debounce(
      async () => {
        this._renderSeq = this._renderSeq + 1;
        const mySeq = this._renderSeq;
        this.renderData = await this.getRenderData();
        if (mySeq !== this._renderSeq) {
          return;
        }
        this.draw();
      },
      DEBOUNCE_DELAY,
      { leading: false, trailing: true },
    );

    if (updateData || this.renderData == null) {
      this.renderLoading();
      _fetchData();
    } else {
      this.draw();
    }
  }

  draw() {
    console.error(
      "Should be implemented by children. Call drawStart and drawEnd in parent",
    );
  }

  drawStart() {
    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    renderHighlights(
      this.trackContainer,
      this.dimensions.height,
      this.dragCallbacks.getHighlights(),
      this.getXScale(),
      (id) => this.dragCallbacks.removeHighlight(id),
    );

    if (this.settings.yAxis != null) {
      this.renderYAxis(this.settings.yAxis);
    }
  }

  setExpandedHeight(height: number) {
    this.expander.expandedHeight = height;
    if (this.expander.isExpanded) {
      this.currentHeight = height;
      this.syncDimensions();
    }
  }

  drawEnd() {
    this.setupLabel(() => this.openTrackContextMenu(this));
  }

  setupLabel(onClick: () => void) {
    const yAxisWidth = this.settings.yAxis != null ? STYLE.yAxis.width : 0;
    const box = this.drawTrackLabel(yAxisWidth);
    const hoverBox = {
      label: this.label,
      box,
    };
    getCanvasClick(this.canvas, () => [hoverBox], onClick);
  }

  renderYAxis(yAxis: Axis) {
    const yScale = getLinearScale(yAxis.range, [0, this.dimensions.height]);

    for (const yTick of yAxis.ticks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }

    drawYAxis(this.ctx, yAxis.ticks, yScale, yAxis.range);
  }

  drawTrackLabel(shiftRight: number = 0): Box {
    return drawLabel(
      this.ctx,
      this.label,
      STYLE.tracks.textPadding + shiftRight,
      STYLE.tracks.textPadding,
      { textBaseline: "top", boxStyle: {} },
    );
  }
}

class Expander {
  expandedHeight: number = null;
  isExpanded: boolean;

  constructor(isExpanded: boolean) {
    this.isExpanded = isExpanded;
  }

  toggle() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded && this.expandedHeight == null) {
      console.error("Need to assign an expanded height");
    }
  }
}

customElements.define("data-track", DataTrack);
