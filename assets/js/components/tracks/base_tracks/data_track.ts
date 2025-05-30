import { COLORS, SIZES, STYLE, TRANSPARENCY } from "../../../constants";
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

export interface DataTrackSettings {
  height: ExpandedTrackHeight;
  showLabelWhenCollapsed: boolean;
  yAxis?: Axis;
  yPadBands?: boolean;
  isExpanded: boolean;
}

const DEBOUNCE_DELAY = 50;

const Y_PAD = SIZES.s;

export abstract class DataTrack extends CanvasTrack {
  public trackType: TrackType;
  public setColorBands(colorBands: RenderBand[]) {
    this.colorBands = colorBands;
  }

  protected defaultTrackHeight: number;
  protected collapsedTrackHeight: number;
  // Callback to allow multi-layered settings object
  protected getSettings: () => DataTrackSettings;
  protected updateSettings: (settings: DataTrackSettings) => void;
  protected session: GensSession;
  protected renderData: BandTrackData | DotTrackData | null;

  private colorBands: RenderBand[] = [];
  private isHidden: boolean = false;
  // private isExpanded: boolean;
  private labelBox: HoverBox | null;
  private renderSeq = 0;

  protected getRenderData: () => Promise<BandTrackData | DotTrackData>;
  protected getXRange: () => Rng;
  protected getXScale: () => Scale;
  protected getYRange: () => Rng;
  protected getYScale: () => Scale;
  protected openTrackContextMenu: (track: DataTrack) => void;

  public getYDim(): Rng {
    return [Y_PAD, this.dimensions.height - Y_PAD];
  }

  public getYAxis(): Axis | null {
    return this.getSettings().yAxis;
  }

  public updateYAxis(range: Rng) {
    this.getSettings().yAxis.range = range;
  }

  public getIsExpanded(): boolean {
    return this.getSettings().isExpanded;
  }

  public setHeights(collapsed: number, expanded?: number) {
    this.getSettings().height.collapsedHeight = collapsed;
    if (expanded != null) {
      this.getSettings().height.expandedHeight = expanded;
    }
    this.syncHeight();
  }

  public toggleHidden() {
    this.isHidden = !this.isHidden;
    // FIXME: Consider using a CSS class for this
    if (this.isHidden) {
      this.trackContainer.style.display = "none";
    } else {
      this.trackContainer.style.display = "block";
    }
  }

  public getIsHidden() {
    return this.isHidden;
  }

  public toggleExpanded() {
    const settings = this.getSettings();
    settings.isExpanded = !settings.isExpanded;
    this.updateSettings(settings);

    if (settings.isExpanded && settings.height.expandedHeight == null) {
      return;
    }

    this.syncHeight();
  }

  protected syncHeight() {
    this.currentHeight = this.getSettings().isExpanded
      ? this.getSettings().height.expandedHeight
      : this.getSettings().height.collapsedHeight;
  }

  protected initializeExpander(eventKey: string, onExpand: () => void) {
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
    getSettings: () => DataTrackSettings,
    updateSettings: (settings: DataTrackSettings) => void,
    session: GensSession,
  ) {
    const heightConf = getSettings != null ? getSettings().height : null;
    const height =
      heightConf != null
        ? heightConf.startExpanded
          ? heightConf.expandedHeight
          : heightConf.collapsedHeight
        : 10;
    super(id, label, {
      height,
    });

    this.trackType = trackType;
    this.getSettings = getSettings;
    this.getXRange = getXRange;
    this.getXScale = getXScale;
    this.session = session;
    this.updateSettings = updateSettings;

    this.getYRange = () => {
      return getSettings().yAxis.range;
    };
    this.getYScale = () => {
      const yRange = this.getYRange();
      // Screen coordinates starts from the top
      const reverse = true;
      const yScale = getLinearScale(yRange, this.getYDim(), reverse);
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
        this.renderLoading();
        this.renderData = await this.getRenderData();
        if (mySeq !== this.renderSeq) {
          return;
        }
        this.draw(this.renderData);
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
      this.draw(this.renderData);
    }
  }

  abstract draw(renderData: DotTrackData | BandTrackData): void;

  protected drawStart() {
    // super.syncDimensions();
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

    if (this.getSettings().yAxis != null) {
      renderYAxis(
        this.ctx,
        this.getSettings().yAxis,
        this.getYScale(),
        this.dimensions,
        this.getSettings(),
      );
    }
  }

  setExpandedHeight(height: number) {
    const settings = this.getSettings();
    settings.height.expandedHeight = height;
    this.updateSettings(settings);
    if (settings.isExpanded) {
      this.currentHeight = height;
      this.syncDimensions();
    }
  }

  protected drawEnd() {
    const settings = this.getSettings();
    if (settings.isExpanded || settings.showLabelWhenCollapsed) {
      const yAxisWidth = STYLE.yAxis.width;
      const labelBox = this.drawTrackLabel(yAxisWidth);
      this.labelBox = {
        label: this.label,
        box: labelBox,
      };
    }
  }

  drawTrackLabel(shiftRight: number = 0): Box {
    return drawLabel(
      this.ctx,
      this.label,
      STYLE.tracks.textPadding + shiftRight,
      STYLE.tracks.textPadding,
      {
        textBaseline: "top",
        boxStyle: { fillColor: `${COLORS.white}${TRANSPARENCY.s}` },
      },
    );
  }
}

export function renderYAxis(
  ctx: CanvasRenderingContext2D,
  yAxis: Axis,
  yScale: Scale,
  dimensions: Dimensions,
  settings: { isExpanded?: boolean },
) {
  // const yScale = this.getYScale();
  const tickSize = getTickSize(yAxis.range);
  const ticks = generateTicks(yAxis.range, tickSize);

  for (const yTick of ticks) {
    const yPx = yScale(yTick);

    const lineDims = {
      x1: STYLE.yAxis.width,
      x2: dimensions.width,
      y1: yPx,
      y2: yPx,
    };

    drawLine(ctx, lineDims, {
      color: STYLE.colors.lighterGray,
      dashed: false,
    });
  }

  // const settings = this.getSettings();
  const hideLabel = yAxis.hideLabelOnCollapse && !settings.isExpanded;
  const hideTicks = yAxis.hideTicksOnCollapse && !settings.isExpanded;

  const label = hideLabel ? "" : yAxis.label;
  const renderTicks = hideTicks ? [] : ticks;

  drawYAxis(ctx, renderTicks, yScale, yAxis.range, label);
}
