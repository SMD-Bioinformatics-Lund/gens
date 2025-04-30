import { STYLE } from "../../../constants";
import { getLinearScale } from "../../../draw/render_utils";
import { keyLogger } from "../../util/keylogger";
import { CanvasTrack } from "./canvas_track";
import { initializeDragSelect, renderHighlights } from "./interactive_tools";

interface TrackSettings {
  defaultTrackHeight: number;
  dragSelect: boolean;
}

interface Callbacks {
  onZoomIn: (xRange: Rng) => void;
  onZoomOut: () => void;
  getHighlights: () => Rng[];
  addHighlight: (range: Rng) => void;
}

interface RenderConfig {
  xScale: Scale,
  xRange: Rng,
}

export class DataTrack extends CanvasTrack {
  // xRange: Rng | null = null;



  // onZoomIn: (xRange: Rng) => void;
  // onZoomOut: () => void;
  // getHighlights: (() => Rng[]) | null;
  // addHighlight: (range: Rng) => void;

  settings: TrackSettings;
  callbacks: Callbacks;
  renderConfig: RenderConfig | null = null;

  constructor(
    id: string,
    label: string,
    callbacks: Callbacks,
    settings: TrackSettings,
  ) {
    super(id, label, settings.defaultTrackHeight);
    this.callbacks = callbacks;
    this.settings = settings;
  }

  initialize() {
    super.initialize();

    if (this.callbacks != null) {
      this.setupDrag();
    }
  }

  setupDrag() {
    initializeDragSelect(
      this.canvas,
      (pxRangeX: Rng, _pxRangeY: Rng, shiftPress: boolean) => {

        const renderConfig = this.renderConfig;
        if (this.renderConfig == null) {
          console.error("No render config set");
        }

        const yAxisWidth = STYLE.yAxis.width;

        const pixelToPos = getLinearScale(
          [yAxisWidth, this.dimensions.width],
          renderConfig.xRange,
        );
        const posStart = Math.max(0, pixelToPos(pxRangeX[0]));
        const posEnd = pixelToPos(pxRangeX[1]);

        if (shiftPress) {
          this.callbacks.onZoomIn([Math.floor(posStart), Math.floor(posEnd)]);
        } else {
          console.log("Update the select here");
          this.callbacks.addHighlight([posStart, posEnd]);
        }
      },
    );

    this.trackContainer.addEventListener("click", () => {
      if (keyLogger.heldKeys.Control) {
        this.callbacks.onZoomOut();
      }
    });
  }

  async render(_updateData: boolean) {

    const renderConfig = this.renderConfig;
    if (renderConfig == null) {
      throw Error("Cannot call render without renderConfig assigned");
    }

    renderHighlights(
      this.trackContainer,
      this.dimensions.height,
      this.callbacks.getHighlights(),
      renderConfig.xScale,
    );
  }
}

customElements.define("data-track", DataTrack);
