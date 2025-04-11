import { STYLE } from "../../constants";
import { renderBackground } from "../../draw/render_utils";
import { drawLabel } from "../../draw/shapes";
import { Tooltip } from "../../util/tooltip_utils";

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

export class CanvasTrack extends HTMLElement {
  public label: string;

  protected _root: ShadowRoot;
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected dimensions: { width: number; height: number };
  protected _scaleFactor: number;
  protected trackContainer: HTMLDivElement;
  protected defaultTrackHeight: number;
  private currentHeight: number;

  private expander: Expander;

  private tooltip: Tooltip;
  hoverTargets: HoverBox[];

  onElementClick: (element: RenderBand|RenderDot) => void;

  render(_updateData: boolean) {}

  isExpanded(): boolean {
    return this.expander.isExpanded;
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

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));
  }

  initializeCanvas(label: string, trackHeight: number) {
    this.label = label;
    this.canvas = this._root.getElementById("canvas") as HTMLCanvasElement;

    this.defaultTrackHeight = trackHeight;
    this.currentHeight = trackHeight;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.trackContainer = this._root.getElementById(
      "track-container",
    ) as HTMLDivElement;

    this.syncDimensions();
  }

  // FIXME: Move to attribute component
  initializeExpander(height: number, expanded: boolean = false) {
    this.expander = new Expander(expanded);

    this.trackContainer.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      this.expander.toggle();

      this.currentHeight = this.expander.isExpanded
        ? this.expander.expandedHeight
        : height;
      this.syncDimensions();
      this.render(false);
    });
  }

  // FIXME: Should this live outside the class?
  initializeInteractive() {
    this.tooltip = new Tooltip(document.body);
    this.canvas.addEventListener("mousemove", (event) => {
      this.tooltip.onMouseMove(this.canvas, event.offsetX, event.offsetY);

      if (this.hoverTargets == null) {
        return;
      }

      const hovered = this.hoverTargets.find(
        (target) =>
          event.offsetX >= target.box.x1 &&
          event.offsetX <= target.box.x2 &&
          event.offsetY >= target.box.y1 &&
          event.offsetY <= target.box.y2,
      );
      this.canvas.style.cursor = hovered ? "pointer" : "default";

      if (hovered) {
        this.tooltip.tooltipEl.textContent = hovered.label;
        this.tooltip.onMouseMove(this.canvas, event.offsetX, event.offsetY);
      } else {
        this.tooltip.onMouseLeave();
      }
    });
    this.canvas.addEventListener("mouseleave", () => {
      this.tooltip.onMouseLeave();
    });
  }

  setHoverTargets(hoverTargets: HoverBox[]) {
    this.hoverTargets = hoverTargets;


  }

  baseRender() {
    this.syncDimensions();
    renderBackground(this.ctx, this.dimensions, STYLE.tracks.edgeColor);
  }

  drawTrackLabel(shiftRight: number = 0) {
    drawLabel(
      this.ctx,
      this.label,
      STYLE.tracks.textPadding + shiftRight,
      STYLE.tracks.textPadding,
      {textBaseline: "top"},
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
      // this.canvas.width = displayWidth;
    }

    this.dimensions = {
      width: displayWidth,
      height: displayHeight,
    };
    return this.dimensions;
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
