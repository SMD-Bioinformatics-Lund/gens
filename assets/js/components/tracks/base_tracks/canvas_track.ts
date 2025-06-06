import { renderBackground } from "../../../draw/render_utils";
import { drawBox, drawLabel } from "../../../draw/shapes";
import { ShadowBaseElement } from "../../util/shadowbaseelement";
import {
  setupCanvasClick,
  getCanvasHover,
} from "../../util/canvas_interaction";
import { COLORS } from "../../../constants";

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

export interface CanvasTrackSettings {
  height: number;
}

export abstract class CanvasTrack extends ShadowBaseElement {
  public id: string;
  public label: string;

  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected dimensions: { width: number; height: number };
  protected scaleFactor: number;
  protected trackContainer: HTMLDivElement;

  protected startHeight: number;
  protected currentHeight: number;

  hoverTargets: HoverBox[];
  isInitialized: boolean = false;
  protected queuedRendering: boolean = false;

  onElementClick: (element: RenderBand | RenderDot) => void | null;

  constructor(id: string, label: string, settings: CanvasTrackSettings) {
    super(template);

    this.id = id;
    this.label = label;
    this.startHeight = settings.height;
    this.currentHeight = this.startHeight;
  }

  getNtsPerPixel(xRange: Rng) {
    const nNts = xRange[1] - xRange[0];
    const nPxs = this.dimensions.width;
    return nNts / nPxs;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.canvas = this.root.getElementById("canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.trackContainer = this.root.getElementById(
      "track-container",
    ) as HTMLDivElement;
  }

  initialize() {
    if (!this.isConnected) {
      throw Error(
        `Component must be attached to DOM before being initialized (label: ${this.label})`,
      );
    }

    // FIXME: Can this be moved to connected callback?
    // Then the initialize could be completely removed
    this.syncDimensions();
    this.isInitialized = true;
  }

  /**
   * Draw a blue box straight into canvas for debugging
   */
  debugRender(
    color: string = "blue",
    box: Box = { x1: 1, x2: 100, y1: 1, y2: 100 },
  ) {
    drawBox(this.ctx, box, { fillColor: color });
  }

  renderLoading() {
    if (this.ctx == null) {
      throw Error(`${this.label}: Track cannot be rendered before initialized`);
    }
    renderBackground(this.ctx, this.dimensions);
    drawLabel(
      this.ctx,
      "Loading ...",
      this.dimensions.width / 2,
      this.dimensions.height / 2,
      { textBaseline: "middle", textAlign: "center" },
    );
  }

  // Placeholder needed for Typescript to understand that an array of CanvasTracks
  // can all be rendered as such: canvas.render(updateData);
  async render(_updateData: RenderSettings) {}

  initializeClick(onElementClick: (el: HoverBox) => void | null = null) {
    setupCanvasClick(
      this.canvas,
      () => this.hoverTargets,
      onElementClick,
      this.getListenerAbortSignal(),
    );
  }

  initializeHoverTooltip() {
    getCanvasHover(
      this.canvas,
      () => this.hoverTargets,
      { showTooltip: true },
      this.getListenerAbortSignal(),
    );
  }

  setHoverTargets(hoverTargets: HoverBox[]) {
    this.hoverTargets = hoverTargets;
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
