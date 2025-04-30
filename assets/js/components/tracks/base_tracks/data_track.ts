import { STYLE } from "../../../constants";
import { getLinearScale } from "../../../draw/render_utils";
import { drawHorizontalLineInScale } from "../../../draw/shapes";
import { keyLogger } from "../../util/keylogger";
import { CanvasTrack } from "./canvas_track";
import { initializeDragSelect, renderHighlights } from "./interactive_tools";

// This is assigned at setup time
interface SetupConfig {
  defaultTrackHeight: number;
  dragSelect: boolean;
  yAxis: {
    range: Rng;
    ticks: number[];
  } | null;
}

export class DataTrack extends CanvasTrack {

  setupConfig: SetupConfig;
  getXRange: () => Rng;
  getXScale: () => Scale;
  getYRange: () => Rng;
  getYScale: () => Scale;
  dragCallbacks: DragCallbacks;

  constructor(
    id: string,
    label: string,
    getXRange: () => Rng,
    getXScale: () => Scale,
    callbacks: DragCallbacks,
    settings: SetupConfig,
  ) {
    super(id, label, settings.defaultTrackHeight);
    this.dragCallbacks = callbacks;
    this.setupConfig = settings;
    this.getXRange = getXRange;
    this.getXScale = getXScale;

    this.getYRange = () => {
      return settings.yAxis.range;
    };
    this.getYScale = () => {
      const yRange = this.getYRange();
      const yScale = getLinearScale(yRange, [0, this.dimensions.height]);
      return yScale;
    };
  }

  initialize() {
    super.initialize();

    if (this.dragCallbacks != null) {
      this.setupDrag();
    }
  }

  setupDrag() {
    initializeDragSelect(
      this.canvas,
      (pxRangeX: Rng, _pxRangeY: Rng, shiftPress: boolean) => {
        const xRange = this.getXRange();
        // const renderConfig = this.runtimeConfig;
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
          this.dragCallbacks.onZoomIn([
            Math.floor(posStart),
            Math.floor(posEnd),
          ]);
        } else {
          console.log("Update the select here");
          this.dragCallbacks.addHighlight([posStart, posEnd]);
        }
      },
    );

    this.trackContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        this.dragCallbacks.onZoomOut();
      }
    });
  }

  async render(updateData: boolean) {
    super.render(updateData);
    renderHighlights(
      this.trackContainer,
      this.dimensions.height,
      this.dragCallbacks.getHighlights(),
      this.getXScale(),
    );
    if (this.setupConfig.yAxis != null) {
      this.renderYAxis(this.setupConfig.yAxis);
    }
  }

  renderYAxis(yAxis: Axis) {
    console.log("Rendering y axis", yAxis);
    const yScale = getLinearScale(yAxis.range, [0, this.dimensions.height]);

    for (const yTick of yAxis.ticks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }
  }
}

customElements.define("data-track", DataTrack);
