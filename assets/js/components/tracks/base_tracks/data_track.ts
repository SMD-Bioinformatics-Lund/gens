import { SIZES, STYLE } from "../../../constants";
import {
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../../draw/render_utils";
import { drawHorizontalLineInScale, drawLabel } from "../../../draw/shapes";
import { GensSession } from "../../../state/session";
import { generateID, generateTicks, getTickSize } from "../../../util/utils";
import {
  setupCanvasClick,
  setCanvasPointerCursor,
} from "../../util/canvas_interaction";
import { keyLogger } from "../../util/keylogger";
import { CanvasTrack } from "./canvas_track";
import { initializeDragSelect, renderHighlights } from "./interactive_tools";

import debounce from "lodash.debounce";

interface Settings {
  defaultHeight: number;
  dragSelect: boolean;
  yAxis: {
    range: Rng;
  } | null;
}

const DEBOUNCE_DELAY = 500;

const Y_PAD = SIZES.s;

export class DataTrack extends CanvasTrack {
  settings: Settings;
  getXRange: () => Rng;
  getXScale: () => Scale;
  getYRange: () => Rng;
  getYScale: () => Scale;
  dragCallbacks: DragCallbacks;
  openTrackContextMenu: (track: DataTrack) => void;

  private isHidden: boolean = false;
  private isCollapsed: boolean = false;
  private expander: Expander;

  renderData: BandTrackData | DotTrackData | null;
  getRenderData: () => Promise<BandTrackData | DotTrackData>;
  session: GensSession;

  private renderSeq = 0;

  getYDim(): Rng {
    return [Y_PAD, this.dimensions.height - Y_PAD];
  }

  getYAxis(): Axis | null {
    return this.settings.yAxis;
  }

  updateYAxis(range: Rng) {
    this.settings.yAxis.range = range;
  }

  isExpanded(): boolean {
    return this.expander.isExpanded;
  }

  getIsCollapsed(): boolean {
    return this.isCollapsed;
  }

  toggleHidden() {
    this.isHidden = !this.isHidden;
    // FIXME: Consider using a CSS class for this
    if (this.isHidden) {
      this.trackContainer.style.display = "none";
    } else {
      this.trackContainer.style.display = "block";
    }
  }

  getIsHidden() {
    return this.isHidden;
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
    session: GensSession,
  ) {
    super(id, label, settings.defaultHeight);
    this.dragCallbacks = callbacks;
    this.settings = settings;
    this.getXRange = getXRange;
    this.getXScale = getXScale;
    this.session = session;

    this.getYRange = () => {
      return settings.yAxis.range;
    };
    this.getYScale = () => {
      const yRange = this.getYRange();
      const yScale = getLinearScale(yRange, this.getYDim());
      return yScale;
    };

    this.openTrackContextMenu = openTrackContextMenu;
  }

  initialize() {
    super.initialize();

    if (this.dragCallbacks != null) {
      // FIXME: Look over this, how to make the dragging "feel" neat
      this.setupDrag();
    }

    // // Marker mode
    // this.canvas.addEventListener("mousemove", (e) => {
    //   console.log(this.label, "Moving", e.offsetX);
    //   if (this.session.markerModeOn && e.offsetX > STYLE.yAxis.width) {
    //     console.log(this.label, "Inside!")
    //     this.canvas.style.cursor = "pointer";
    //   } else {
    //     console.log(this.label, "Outside!")
    //     this.canvas.style.cursor = "";
    //   }
    // })
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

    // FIXME: Temporarily paused, refine and bring it back
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

  async render(settings: RenderSettings) {
    // The intent with the debounce keeping track of the rendering number (_renderSeq)
    // is to prevent repeated API requests when rapidly zooming/panning
    // Only the last request is of interest
    const _fetchData = debounce(
      async () => {
        this.renderSeq = this.renderSeq + 1;
        const mySeq = this.renderSeq;
        this.renderData = await this.getRenderData();
        if (mySeq !== this.renderSeq) {
          return;
        }
        this.draw();
      },
      DEBOUNCE_DELAY,
      { leading: false, trailing: true },
    );

    if (settings.dataUpdated || this.renderData == null) {
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
    const labelBox = this.setupLabel(() => this.openTrackContextMenu(this));
    setCanvasPointerCursor(
      this.canvas,
      () => {
        const hoverTargets = this.hoverTargets ? this.hoverTargets : [];
        return hoverTargets.concat([labelBox]);
      },
      () => this.session.getMarkerMode(),
      [0, STYLE.yAxis.width]
    );
  }

  setupLabel(onClick: () => void): HoverBox {
    const yAxisWidth = this.settings.yAxis != null ? STYLE.yAxis.width : 0;
    const labelBox = this.drawTrackLabel(yAxisWidth);
    const hoverBox = {
      label: this.label,
      box: labelBox,
    };
    setupCanvasClick(this.canvas, () => [hoverBox], onClick);
    return hoverBox;
  }

  renderYAxis(yAxis: Axis) {
    const yScale = getLinearScale(yAxis.range, this.getYDim());
    const tickSize = getTickSize(yAxis.range);
    const ticks = generateTicks(yAxis.range, tickSize);

    for (const yTick of ticks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }

    drawYAxis(this.ctx, ticks, yScale, yAxis.range);
  }

  drawTrackLabel(shiftRight: number = 0): Box {
    if (!this.isCollapsed) {
      return drawLabel(
        this.ctx,
        this.label,
        STYLE.tracks.textPadding + shiftRight,
        STYLE.tracks.textPadding,
        { textBaseline: "top", boxStyle: {} },
      );
    } else {
      // FIXME: Display something on hover
      return {
        x1: 0,
        x2: STYLE.yAxis.width,
        y1: 0,
        y2: this.dimensions.height,
      };
    }
  }
}

// FIXME: Consider what to do with this one. Remove? General height controller?
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
