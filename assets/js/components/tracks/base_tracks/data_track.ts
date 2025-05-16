import { COLORS, SIZES, STYLE } from "../../../constants";
import {
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../../draw/render_utils";
import { drawBox, drawLabel, drawLine } from "../../../draw/shapes";
import { GensSession } from "../../../state/gens_session";
import { generateTicks, getTickSize } from "../../../util/utils";
import {
  setupCanvasClick,
  setCanvasPointerCursor,
} from "../../util/canvas_interaction";
import { CanvasTrack } from "./canvas_track";

import debounce from "lodash.debounce";

export interface ExpandedTrackHeight {
  collapsedHeight: number;
  expandedHeight?: number;
  startExpanded: boolean;
}

interface DataTrackSettings {
  height: ExpandedTrackHeight;
  dragSelect: boolean;
  yAxis: Axis | null;
}

const DEBOUNCE_DELAY = 50;

const Y_PAD = SIZES.s;

export abstract class DataTrack extends CanvasTrack {
  settings: DataTrackSettings;
  getXRange: () => Rng;
  getXScale: () => Scale;
  getYRange: () => Rng;
  getYScale: () => Scale;
  openTrackContextMenu: (track: DataTrack) => void;

  trackType: TrackType;

  protected defaultTrackHeight: number;
  protected collapsedTrackHeight: number;

  private colorBands: RenderBand[] = [];
  setColorBands(colorBands: RenderBand[]) {
    this.colorBands = colorBands;
  }

  private isHidden: boolean = false;
  private isExpanded: boolean;
  session: GensSession;

  labelBox: HoverBox | null;

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

  getIsExpanded(): boolean {
    return this.isExpanded;
  }

  setHeights(collapsed: number, expanded?: number) {
    this.settings.height.collapsedHeight = collapsed;
    if (expanded != null) {
      this.settings.height.expandedHeight = expanded;
    }
    this.syncHeight();
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

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded && this.settings.height.expandedHeight == null) {
      throw Error("Must assign an expanded height before expanding the track");
    }

    this.syncHeight();
  }

  syncHeight() {
    this.currentHeight = this.isExpanded
      ? this.settings.height.expandedHeight
      : this.settings.height.collapsedHeight;
  }

  initializeExpander(eventKey: string, onExpand: () => void) {
    this.trackContainer.addEventListener(
      eventKey,
      (event) => {
        event.preventDefault();
        this.toggleExpanded();
        this.syncDimensions();
        onExpand();
      },
      { signal: this.getListenerAbortSignal() },
    );
  }

  constructor(
    id: string,
    label: string,
    trackType: TrackType,
    getXRange: () => Rng,
    getXScale: () => Scale,
    openTrackContextMenu: (track: DataTrack) => void,
    settings: DataTrackSettings,
    session: GensSession,
  ) {
    super(id, label, {
      height: settings.height.startExpanded
        ? settings.height.expandedHeight
        : settings.height.collapsedHeight,
    });
    this.trackType = trackType;
    this.settings = settings;
    this.getXRange = getXRange;
    this.getXScale = getXScale;
    this.session = session;

    this.isExpanded = settings.height.startExpanded;

    this.getYRange = () => {
      return settings.yAxis.range;
    };
    this.getYScale = () => {
      const yRange = this.getYRange();
      const yScale = getLinearScale(
        yRange,
        this.getYDim(),
        settings.yAxis.reverse,
      );
      return yScale;
    };

    this.openTrackContextMenu = openTrackContextMenu;
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Label click
    setupCanvasClick(
      this.canvas,
      () => {
        const targets = this.labelBox != null ? [this.labelBox] : [];
        return targets;
      },
      () => this.openTrackContextMenu(this),
      this.getListenerAbortSignal(),
    );
    // Pointer cursor (for all)
    setCanvasPointerCursor(
      this.canvas,
      () => {
        const targets = this.hoverTargets != null ? [...this.hoverTargets] : [];
        if (this.labelBox != null) {
          targets.push(this.labelBox);
        }
        return targets;
      },
      () => this.session.getMarkerModeOn(),
      [0, STYLE.yAxis.width],
      this.getListenerAbortSignal(),
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
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

  protected drawStart() {
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
      };
      drawBox(this.ctx, box, { fillColor: band.color, alpha: 0.3 });
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
    this.settings.height.expandedHeight = height;
    if (this.isExpanded) {
      this.currentHeight = height;
      this.syncDimensions();
    }
  }

  protected drawEnd() {
    const yAxisWidth = STYLE.yAxis.width;
    const labelBox = this.drawTrackLabel(yAxisWidth);
    this.labelBox = {
      label: this.label,
      box: labelBox,
    };
  }

  renderYAxis(yAxis: Axis) {
    const yScale = this.getYScale();
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
        color: STYLE.colors.lighterGray,
        dashed: false,
      });
    }

    const hideDetails = yAxis.hideLabelOnCollapse && !this.isExpanded;

    const label = hideDetails ? "" : yAxis.label;
    const renderTicks = hideDetails ? [] : ticks;

    drawYAxis(this.ctx, renderTicks, yScale, yAxis.range, label);
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
