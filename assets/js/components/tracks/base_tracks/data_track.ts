import { STYLE } from "../../../constants";
import { drawYAxis, getLinearScale } from "../../../draw/render_utils";
import { drawHorizontalLineInScale } from "../../../draw/shapes";
import { generateID } from "../../../util/utils";
import { keyLogger } from "../../util/keylogger";
import { CanvasTrack } from "./canvas_track";
import { initializeDragSelect, renderHighlights } from "./interactive_tools";

import debounce from "lodash.debounce";

interface Settings {
  defaultHeight: number,
  dragSelect: boolean;
  yAxis: {
    range: Rng;
    ticks: number[];
  } | null;
}

export class DataTrack extends CanvasTrack {

  setupConfig: Settings;
  getXRange: () => Rng;
  getXScale: () => Scale;
  getYRange: () => Rng;
  getYScale: () => Scale;
  dragCallbacks: DragCallbacks;

  renderData: BandTrackData|DotTrackData | null;
  getRenderData: () => Promise<BandTrackData|DotTrackData>;

  private _renderSeq = 0;

  constructor(
    id: string,
    label: string,
    getXRange: () => Rng,
    getXScale: () => Scale,
    callbacks: DragCallbacks,
    settings: Settings,
  ) {
    super(id, label, settings.defaultHeight);
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

  private _fetchData = debounce(
    async () => {
      this._renderSeq = this._renderSeq + 1;
      const mySeq = this._renderSeq;
      this.renderData = await this.getRenderData();
      if (mySeq !== this._renderSeq) {
        return;
      }
      this.draw();
    },
    500,
    { leading: false, trailing: true },
  )



  initialize() {
    super.initialize();

    if (this.dragCallbacks != null) {
      this.setupDrag();
    }
  }

  setupDrag() {

    const onDrag = (pxRangeX: Rng, _pxRangeY: Rng, shiftPress: boolean) => {
      const xRange = this.getXRange();
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
        const id = generateID()
        this.dragCallbacks.addHighlight(id, [posStart, posEnd]);
      }
    };

    initializeDragSelect(
      this.canvas,
      onDrag,
      this.dragCallbacks.removeHighlight
    );

    this.trackContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        this.dragCallbacks.onZoomOut();
      }
    });
  }

  async render(updateData: boolean) {
    if (updateData || this.renderData == null) {
      this.renderLoading();
      this._fetchData();
      // this.renderData = await this.getRenderData();
    } else {
      this.draw();
    }
  }

  draw() {
    renderHighlights(
      this.trackContainer,
      this.dimensions.height,
      this.dragCallbacks.getHighlights(),
      this.getXScale(),
      (id) => this.dragCallbacks.removeHighlight(id),
    );
    if (this.setupConfig.yAxis != null) {
      this.renderYAxis(this.setupConfig.yAxis);
    }

    if (this.getRenderData == undefined) {
      throw Error(`No getRenderData set up for track, must initialize first`);
    }
    if (!this.isInitialized) {
      throw Error("Track is not initialized yet");
    }


  }


  renderYAxis(yAxis: Axis) {
    const yScale = getLinearScale(yAxis.range, [0, this.dimensions.height]);

    for (const yTick of yAxis.ticks) {
      drawHorizontalLineInScale(this.ctx, yTick, yScale, {
        color: STYLE.colors.lightGray,
        dashed: true,
      });
    }

    drawYAxis(this.ctx, yAxis.ticks, yScale, yAxis.range);
  }
}

customElements.define("data-track", DataTrack);
