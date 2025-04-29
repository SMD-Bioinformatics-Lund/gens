import { STYLE } from "../../../constants";
import { renderBackground } from "../../../draw/render_utils";
import { drawLabel } from "../../../draw/shapes";
import { Tooltip } from "../../../util/tooltip_utils";

import { ShadowBaseElement } from "../../util/shadowbaseelement";
import { eventInBox } from "../../../util/utils";

// FIXME: Move somewhere
const PADDING_SIDES = 0;

const template = document.createElement("template");
template.innerHTML = String.raw`
  <style>
    :host {
      display: block;
      width: 100%;
    }
    #container {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      /* overflow: hidden; */
      padding-left: ${PADDING_SIDES}px;
      padding-right: ${PADDING_SIDES}px;
    }
    canvas {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
  </style>
  <div id="container" data-state="nodata">
      <div id='track-container' style="position: relative;">
          <canvas id='canvas'></canvas>
      </div>
  </div>
`;

export class CanvasTrack extends ShadowBaseElement {
  public id: string;
  public label: string;

  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected dimensions: { width: number; height: number };
  protected _scaleFactor: number;
  protected trackContainer: HTMLDivElement;
  protected defaultTrackHeight: number;
  private currentHeight: number;

  private expander: Expander;

  hoverTargets: HoverBox[];
  isInitialized: boolean = false;
  protected queuedRendering: boolean = false;

  onElementClick: (element: RenderBand | RenderDot) => void | null;

  render(_updateData: boolean) {}

  isExpanded(): boolean {
    return this.expander.isExpanded;
  }

  constructor(id: string, label: string, defaultTrackHeight: number) {
    super(template);

    this.id = id;
    this.label = label;
    this.defaultTrackHeight = defaultTrackHeight;
  }

  setExpandedHeight(height: number) {
    this.expander.expandedHeight = height;
    if (this.expander.isExpanded) {
      this.currentHeight = height;
      this.syncDimensions();
    }
  }

  getNtsPerPixel(xRange: Rng) {
    const nNts = xRange[1] - xRange[0];
    const nPxs = this.dimensions.width;
    return nNts / nPxs;
  }

  initialize() {
    if (!this.isConnected) {
      throw Error(
        `Component must be attached to DOM before being initialized (label: ${this.label})`,
      );
    }

    this.canvas = this.root.getElementById("canvas") as HTMLCanvasElement;

    this.currentHeight = this.defaultTrackHeight;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.trackContainer = this.root.getElementById(
      "track-container",
    ) as HTMLDivElement;

    this.syncDimensions();

    this.isInitialized = true;
  }

  renderLoading() {
    renderBackground(this.ctx, this.dimensions);
    drawLabel(
      this.ctx,
      "Loading ...",
      this.dimensions.width / 2,
      this.dimensions.height / 2,
      { textBaseline: "middle", textAlign: "center" },
    );
  }

  initializeExpander(eventKey: string, startExpanded: boolean) {
    this.expander = new Expander(startExpanded);
    const height = this.defaultTrackHeight;

    this.trackContainer.addEventListener(eventKey, (event) => {
      event.preventDefault();
      this.expander.toggle();
      this.currentHeight = this.expander.isExpanded
        ? this.expander.expandedHeight
        : height;
      this.syncDimensions();
      this.render(false);
    });
  }

  initializeClick(onElementClick: (el: HoverBox) => void | null = null) {
    this.canvas.addEventListener("click", (event) => {
      if (!this.hoverTargets || !onElementClick) {
        return;
      }

      const hoveredTarget = this.hoverTargets.find((target) =>
        eventInBox(event, target.box),
      );

      if (hoveredTarget && onElementClick) {
        onElementClick(hoveredTarget);
      }
    });

    this.canvas.addEventListener("mousemove", (event) => {
      if (!this.hoverTargets) {
        return;
      }
      const hovered = this.hoverTargets.find((target) =>
        eventInBox(event, target.box),
      );
      if (onElementClick) {
        this.canvas.style.cursor = hovered ? "pointer" : "default";
      }
    })
  }

  initializeHoverTooltip() {
    const tooltip = new Tooltip(document.body);

    this.canvas.addEventListener("mousemove", (event) => {
      if (this.hoverTargets == null) {
        return;
      }
      tooltip.onMouseMove(this.canvas, event.offsetX, event.offsetY);

      const hovered = this.hoverTargets.find((target) =>
        eventInBox(event, target.box),
      );

      if (hovered) {
        tooltip.tooltipEl.textContent = hovered.label;
        tooltip.onMouseMove(this.canvas, event.offsetX, event.offsetY);
      } else {
        tooltip.onMouseLeave();
      }
    });
    this.canvas.addEventListener("mouseleave", () => {
      tooltip.onMouseLeave();
    });
  }

  setHoverTargets(hoverTargets: HoverBox[]) {
    this.hoverTargets = hoverTargets;
  }

  drawTrackLabel(shiftRight: number = 0) {
    drawLabel(
      this.ctx,
      this.label,
      STYLE.tracks.textPadding + shiftRight,
      STYLE.tracks.textPadding,
      { textBaseline: "top", boxStyle: {} },
    );
  }

  syncDimensions() {
    if (!this.canvas || !this.trackContainer) {
      console.error("Cannot run syncDimensions before initialize");
      return;
    }

    const availWidth = this.getBoundingClientRect().width;
    const availHeight = this.currentHeight;

    const pixelRatio = 2;

    const displayWidth = Math.floor(availWidth);
    const displayHeight = Math.floor(availHeight);

    const actualWidth = displayWidth * pixelRatio;
    const actualHeight = displayHeight * pixelRatio;

    if (
      this.canvas.width !== actualWidth ||
      this.canvas.height !== actualHeight
    ) {
      this.canvas.width = actualWidth;
      this.canvas.height = actualHeight;

      const ctx = this.canvas.getContext("2d");
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    this.dimensions = {
      width: displayWidth,
      height: displayHeight,
    };
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

customElements.define("canvas-track", CanvasTrack);
