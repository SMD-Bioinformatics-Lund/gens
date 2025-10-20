import {
  COLORS,
  SIZES,
  STYLE,
  TRACK_HEIGHTS,
  TRANSPARENCY,
} from "../../../constants";
import {
  drawYAxis,
  getLinearScale,
  renderBackground,
} from "../../../draw/render_utils";
import { drawBox, drawLabel, drawLine } from "../../../draw/shapes";
import { generateTicks, getTickSize } from "../../../util/utils";
import {
  setupCanvasClick,
  setCanvasPointerCursor,
} from "../../util/canvas_interaction";
import { CanvasTrack } from "./canvas_track";

import debounce from "lodash.debounce";

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
  // protected updateSettings: (settings: DataTrackSettings) => void;
  protected renderData: BandTrackData | DotTrackData | null;

  private colorBands: RenderBand[] = [];
  private labelBox: HoverBox | null;
  private renderSeq = 0;

  protected getRenderData: (() => Promise<BandTrackData | DotTrackData>) | null;
  protected getXRange: () => Rng;
  protected getXScale: () => Scale;
  protected getYRange: () => Rng;
  protected getYScale: () => Scale;
  protected openTrackContextMenu: ((track: DataTrack) => void) | null;
  protected getMarkerModeOn: () => boolean;

  private onExpand: () => void;
  private lastRenderedExpanded: boolean;

  protected setExpanded: ((isExpanded: boolean) => void) | null;
  protected setExpandedHeight: ((expandedHeight: number) => void) | null;

  public getYDim(): Rng {
    return [Y_PAD, this.dimensions.height - Y_PAD];
  }

  public getYAxis(): Axis | null {
    return this.getSettings().yAxis;
  }

  public setYAxis(range: Rng) {
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

  public getIsHidden() {
    return this.getSettings().isHidden;
  }

  public hide() {
    this.getSettings().isHidden = true;
    this.updateHidden();
  }

  private updateHidden(): boolean {
    const isHidden = this.getSettings().isHidden;
    if (isHidden) {
      this.trackContainer.style.display = "none";
    } else {
      this.trackContainer.style.display = "block";
    }
    return isHidden;
  }

  protected syncHeight() {
    this.currentHeight = this.getSettings().isExpanded
      ? this.getSettings().height.expandedHeight
      : this.getSettings().height.collapsedHeight;
  }

  protected initializeExpander(eventKey: string, onExpand: () => void) {
    this.onExpand = onExpand;

    this.trackContainer.addEventListener(
      eventKey,
      (event) => {
        event.preventDefault();
        this.setExpanded(!this.getSettings().isExpanded);
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
    openTrackContextMenu: ((track: DataTrack) => void) | null,
    getSettings: () => DataTrackSettings,
    setExpanded: (isExpanded: boolean) => void | null,
    setExpandedHeight: (height: number) => void | null,
    getMarkerModeOn: () => boolean,
  ) {
    const settings = getSettings != null ? getSettings() : null;
    const heightConf = settings != null ? settings.height : null;
    const fallbackHeight = TRACK_HEIGHTS.xxs;
    const height =
      heightConf != null
        ? settings.isExpanded
          ? heightConf.expandedHeight
          : heightConf.collapsedHeight
        : fallbackHeight;
    super(id, label, {
      height,
    });

    this.trackType = trackType;
    this.getSettings = getSettings;
    this.getXRange = getXRange;
    this.getXScale = getXScale;
    this.getMarkerModeOn = getMarkerModeOn;
    this.setExpanded = setExpanded;
    this.setExpandedHeight = setExpandedHeight;

    this.getYRange = () => {
      // console.log("Current settings", getSettings());
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

    this.trackContainer.style.borderBottom = `${SIZES.xxs}px solid ${COLORS.lightGray}`;

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
      () => this.getMarkerModeOn(),
      [0, STYLE.yAxis.width],
      this.getListenerAbortSignal(),
    );

    this.updateHidden();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  async render(renderSettings: RenderSettings) {
    const isHidden = this.updateHidden();
    if (isHidden) {
      return;
    }

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

    // this.renderData is null here for components not requiring
    // accessing any data through API (i.e. position track)
    if (
      (renderSettings.reloadData || this.renderData == null) &&
      this.getRenderData != null
    ) {
      if (!renderSettings.positionOnly) {
        this.renderLoading();
      }
      fetchData();
    } else {
      this.draw(this.renderData);
    }
  }

  abstract draw(renderData: DotTrackData | BandTrackData): void;

  protected drawStart() {
    const dimensions = this.dimensions;
    renderBackground(this.ctx, dimensions, STYLE.tracks.edgeColor);

    const xScale = this.getXScale();

    const settings = this.getSettings();
    if (this.lastRenderedExpanded != settings.isExpanded) {
      this.lastRenderedExpanded = settings.isExpanded;

      if (this.onExpand) {
        this.syncHeight();
        this.onExpand();
      }
    }

    for (const band of this.colorBands) {
      const box = {
        x1: xScale(band.start),
        x2: xScale(band.end),
        y1: 0,
        y2: this.dimensions.height,
      };
      drawBox(this.ctx, box, {
        fillColor: band.color,
        alpha: STYLE.tracks.backgroundColorTransparency,
      });
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
        settings,
        settings.yAxis,
      );
    }

    this.startClip();
  }

  private startClip() {
    const clipX = STYLE.yAxis.width;
    const clipY = 0;
    const clipWidth = this.dimensions.width - STYLE.yAxis.width;
    const clipHeight = this.dimensions.height;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(clipX, clipY, clipWidth, clipHeight);
    this.ctx.clip();
  }

  protected drawEnd() {
    // Restore the clipping
    this.ctx.restore();

    const settings = this.getSettings();

    if (settings.isExpanded || settings.showLabelWhenCollapsed) {
      const yAxisWidth = STYLE.yAxis.width;
      const labelBox = this.drawTrackLabel(yAxisWidth);

      if (this.openTrackContextMenu != null) {
        this.labelBox = {
          label: this.label,
          box: labelBox,
        };
      }
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
  axisSettings?: { highlightedYs?: number[] },
) {
  const tickSize = getTickSize(yAxis.range);

  const ticks = generateTicks(yAxis.range, tickSize);

  const highlightedYs = axisSettings?.highlightedYs
    ? axisSettings.highlightedYs
    : [];

  const renderTicks = settings.isExpanded
    ? ticks
    : [ticks[0], ticks[ticks.length - 1]];

  for (const yTick of renderTicks) {
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

  for (const highlight of highlightedYs) {
    const yPx = yScale(highlight);

    const lineDims = {
      x1: STYLE.yAxis.width,
      x2: dimensions.width,
      y1: yPx,
      y2: yPx,
    };

    drawLine(ctx, lineDims, {
      color: STYLE.colors.darkGray,
      dashed: false,
    });
  }

  const hideLabel = yAxis.hideLabelOnCollapse && !settings.isExpanded;

  const label = hideLabel ? "" : yAxis.label;

  for (const highlightY of highlightedYs) {
    if (!renderTicks.includes(highlightY)) {
      renderTicks.push(highlightY);
    }
  }

  drawYAxis(ctx, renderTicks, yScale, yAxis.range, label);
}
