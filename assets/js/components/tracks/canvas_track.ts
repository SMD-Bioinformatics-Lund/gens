import { Tooltip } from "./tooltip_utils";

// FIXME: Move somewhere
const PADDING_SIDES = 10;

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
      overflow: hidden;
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
  protected _root: ShadowRoot;
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected dimensions: { width: number; height: number };
  protected _scaleFactor: number;
  protected trackContainer: HTMLDivElement;
  protected label: string;

  // FIXME: Make this an attribute instead
  protected expanded: boolean;

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

    this.expanded = false;
  }

  initializeCanvas(
    label: string,
    trackHeight: number,
    expandedHeight: number | null = null,
  ) {
    this.label = label;
    this.canvas = this._root.getElementById("canvas") as HTMLCanvasElement;
    this.canvas.height = trackHeight;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.trackContainer = this._root.getElementById(
      "track-container",
    ) as HTMLDivElement;

    if (expandedHeight != null) {
      this.initializeExpandable(trackHeight, expandedHeight);
    }

    this.syncDimensions();
    // renderBorder(this.ctx, this.dimensions);
    // this.render();

    // this.canvas.style.width = `${availWidth}px`;
  }

  // FIXME: Move to attribute component
  initializeExpandable(height: number, expandedHeight: number) {
    this.trackContainer.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      this.expanded = !this.expanded;
      this.canvas.height = this.expanded ? expandedHeight : height;
      this.syncDimensions();
      this.render();
    });
  }

  render() {}

  // FIXME: Should this live outside the class?
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
    if (!this.canvas || !this.trackContainer) {
      console.error("Cannot run syncDimensions before initialize");
      return;
    }

    // Must include the padding here. Otherwise this triggers an infinite resize loop.
    const availWidth = this.getBoundingClientRect().width;
    // const availWidth = this.getBoundingClientRect().width;
    // const availWidth = this.trackContainer.clientWidth - 2 * PADDING_SIDES;
    // const availWidth = this.trackContainer.clientWidth - 2 * PADDING_SIDES;
    const newWidth = Math.floor(availWidth);

    if (this.canvas.width !== newWidth) {
      this.canvas.width = newWidth;
      // this.canvas.style.width = `${availWidth}px`;
    }
    

    this.dimensions = {
      width: this.canvas.width,
      height: this.canvas.height,
    };
    return this.dimensions;
  }

  // syncDimensions() {
  //   if (this.canvas == undefined) {
  //     console.error("Cannot run syncDimensions before initialize");
  //   }

  //   const availWidth = this.trackContainer.clientWidth;

  //   console.log("Sync dimension for width", availWidth);

  //   this.canvas.width = availWidth;
  //   this.canvas.style.width = `${availWidth}px`;
  //   this.dimensions = {
  //     width: this.canvas.width,
  //     height: this.canvas.height,
  //   };
  //   return this.dimensions;
  // }
}

customElements.define("canvas-track", CanvasTrack);
