import { COLORS, SIZES, STYLE } from "../../../constants";
import {
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../../draw/render_utils";
import { drawBox, drawLabel, drawLine } from "../../../draw/shapes";
import { GensSession } from "../../../state/session";
import { generateTicks, getTickSize } from "../../../util/utils";
import {
  setupCanvasClick,
  setCanvasPointerCursor,
} from "../../util/canvas_interaction";
import { CanvasTrack } from "./canvas_track";

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

export abstract class DataTrack extends CanvasTrack {
  settings: Settings;
  getXRange: () => Rng;
  getXScale: () => Scale;
  getYRange: () => Rng;
  getYScale: () => Scale;
  openTrackContextMenu: (track: DataTrack) => void;

  private colorBands: RenderBand[] = [];
  setColorBands(colorBands: RenderBand[]) {
    this.colorBands = colorBands;
  }

  // FIXME: All of this state should live elsewhere I think
  // Controlled by the tracks_manager perhaps
  private isHidden: boolean = false;
  private isCollapsed: boolean = false;
  private expander: Expander;
  session: GensSession;
  //

  renderData: BandTrackData | DotTrackData | null;
  getRenderData: () => Promise<BandTrackData | DotTrackData>;

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
  // The track manager can keep track of the expansion state
  // While the track only knows its height
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
    openTrackContextMenu: (track: DataTrack) => void,
    settings: Settings,
    session: GensSession,
  ) {
    super(id, label, settings.defaultHeight);
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

  async render(settings: RenderSettings) {
    // The intent with the debounce keeping track of the rendering number (_renderSeq)
    // is to prevent repeated API requests when rapidly zooming/panning
    // Only the last request is of interest
    const fetchData = debounce(
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

    console.log("Rendering with settings", settings);

    if (settings.dataUpdated || this.renderData == null) {
      if (!settings.positionOnly) {
        this.renderLoading();
      }
      fetchData();
    } else {
      this.draw();
    }
  }

  abstract draw(): void;

  drawStart() {
    super.syncDimensions();
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const xScale = this.getXScale();

    for (const band of this.colorBands) {
      const box = {
        x1: xScale(band.start),
        x2: xScale(band.end),
        y1: 0,
        y2: this.dimensions.height,
      }
      drawBox(
        this.ctx,
        box,
        { fillColor: band.color, alpha: 0.3 },
      );
    }

    // Color fill Y axis area
    drawBox(
      this.ctx,
      { x1: 0, x2: STYLE.yAxis.width, y1: 0, y2: this.dimensions.height },
      { fillColor: COLORS.extraLightGray },
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
      [0, STYLE.yAxis.width],
    );
  }

  setupLabel(onClick: () => void): HoverBox {
    const yAxisWidth = STYLE.yAxis.width;
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
      const yPx = yScale(yTick);

      const lineDims = {
        x1: STYLE.yAxis.width,
        x2: this.dimensions.width,
        y1: yPx,
        y2: yPx,
      };

      drawLine(this.ctx, lineDims, {
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
// This should live in the tracks manager. They only need to know their final
// height.
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
