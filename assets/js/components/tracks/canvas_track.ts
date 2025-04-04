import { linearScale, renderBorder } from "./render_utils";
import { createPopper } from "@popperjs/core";
import {
  createTooltipDiv,
  makeVirtualElementNew,
  tooltipOnMouseMove,
  Tooltip,
} from "./tooltip_utils";

// FIXME: Move somewhere
const PADDING_LEFT = 5;

const template = document.createElement("template");
template.innerHTML = String.raw`
    <div id="container" data-state="nodata" style="padding-left: ${PADDING_LEFT}px; padding-right: ${PADDING_LEFT}">
        <div id='track-container' style="position: relative;">
            <canvas id='canvas'></canvas>
            <!-- <canvas id='canvas-offscreen'></canvas> -->
            <!-- <div id='titles'></div> -->
        </div>
    </div>
`;

export class CanvasTrack extends HTMLElement {
  protected _root: ShadowRoot;
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected dimensions: { width: number; height: number };
  protected _scaleFactor: number;
  protected trackContainer: HTMLDivElement;
  protected label: string;

  private tooltip: Tooltip;
  hoverTargets: {
    label: string;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  }[];

  // private tooltipEl: HTMLDivElement;
  // private popperInstance: ReturnType<typeof createPopper> | null = null;

  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(template.content.cloneNode(true));
  }

  initializeCanvas(label: string, trackHeight: number) {
    // const header = this._root.getElementById("header")
    // header.innerHTML = label;
    this.label = label;
    this.canvas = this._root.getElementById("canvas") as HTMLCanvasElement;
    // this.canvas = this._root.querySelector("#canvas") as HTMLCanvasElement;
    this.canvas.height = trackHeight;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.trackContainer = this._root.getElementById(
      "track-container",
    ) as HTMLDivElement;

    this.syncDimensions();

    renderBorder(this.ctx, this.dimensions);
  }

  initializeTooltip() {
    this.tooltip = new Tooltip(this.trackContainer);
    this.canvas.addEventListener("mousemove", (event) => {
      this.tooltip.onMouseMove(this.canvas, event.offsetX, event.offsetY);

      if (this.hoverTargets == null) {
        return;
      }

      const hovered = this.hoverTargets.find(
        (target) =>
          event.offsetX >= target.x1 &&
          event.offsetX <= target.x2 &&
          event.offsetY >= target.y1 &&
          event.offsetY <= target.y2,
      );

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

  setHoverTargets(
    hoverTargets: {
      label: string;
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    }[],
  ) {}

  syncDimensions() {
    if (this.canvas == undefined) {
      console.error("Cannot run syncDimensions before initialize");
    }

    const availWidth = this.trackContainer.clientWidth;

    // const viewNts = end - start;

    // FIXME: Not the responsibility of this component
    this.canvas.width = availWidth;
    // this.canvas.width = window.innerWidth - PADDING_LEFT;
    this.dimensions = {
      width: this.canvas.width,
      height: this.canvas.height,
    };
    return this.dimensions;
  }

  // FIXME: Move scales to generic utils instead
  getScale(range: Rng, type: "x" | "y"): Scale {
    if (!["x", "y"].includes(type)) {
      throw Error(`Unknown scale type: ${type}, expected x or y`);
    }

    const endDim = type == "x" ? this.dimensions.width : this.dimensions.height;

    const scale = (pos: number) => {
      return linearScale(pos, range, [0, endDim]);
    };
    return scale;
  }

  getColorScale(levels: string[], colorPool: string[], defaultColor: string): ColorScale {
    const colorScale = (level: string) => {
      const levelIndex = levels.indexOf(level);
      if (levelIndex == -1) {
        return defaultColor
      } else if (levelIndex >= colorPool.length) {
        return defaultColor;
      } else {
        return colorPool[levelIndex]
      }
    }
    return colorScale;
  }
}

customElements.define("canvas-track", CanvasTrack);
