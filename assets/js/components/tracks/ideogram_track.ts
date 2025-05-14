import { drawChromosomeBands, getChromosomeShape } from "../../draw/ideogram";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./base_tracks/canvas_track";
import "tippy.js/dist/tippy.css";
import { getLinearScale, renderBand } from "../../draw/render_utils";
import { setCanvasPointerCursor } from "../util/canvas_interaction";
import { eventInBox, sumArray } from "../../util/utils";

export class IdeogramTrack extends CanvasTrack {
  private markerElement: HTMLDivElement;

  private renderData: IdeogramTrackData;
  private getRenderData: () => Promise<IdeogramTrackData>;

  private onBandClick: (band: RenderBand) => void;

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<IdeogramTrackData>,
    onBandClick: (band: RenderBand) => void,
  ) {
    super(id, label, trackHeight);
    this.getRenderData = getRenderData;
    this.onBandClick = onBandClick;
  }

  connectedCallback(): void {
    super.connectedCallback();
    const zoomMarkerElement = setupZoomMarkerElement(this.defaultTrackHeight);
    this.trackContainer.appendChild(zoomMarkerElement);
    this.markerElement = zoomMarkerElement;

    this.initializeHoverTooltip();

    this.initializeClick((band) => {
      this.onBandClick(band.element as RenderBand);
    });

    this.canvas.addEventListener(
      "mousemove",
      (event) => {
        const hovered =
          this.hoverTargets != null
            ? this.hoverTargets.some((target) => eventInBox(event, target.box))
            : false;
        // FIXME: Use CSS class here
        this.canvas.style.cursor = hovered ? "pointer" : "";
      },
      {
        signal: this.getListenerAbortSignal(),
      },
    );
  }

  async render(settings: RenderSettings) {
    if (settings.dataUpdated || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    super.syncDimensions();
    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);

    const { chromInfo, xRange } = this.renderData;

    const chromInfoBands = chromInfo.bands.sort((b1, b2) =>
      b1.start < b2.start ? -1 : 1,
    );

    const chromSize = chromInfo.size;
    const style = STYLE.ideogramTrack;

    const xScale = getLinearScale(
      [1, chromSize],
      [style.xPad, this.dimensions.width - style.xPad],
    );

    let centromere = null;
    if (chromInfo.centromere !== null) {
      const start = Math.round(xScale(chromInfo.centromere.start));
      const end = Math.round(xScale(chromInfo.centromere.end));
      centromere = {
        start,
        end,
        center: (start + end) / 2,
      };
    }

    const stainToColor = STYLE.ideogramTrack.stainToColor;
    const renderBands = chromInfoBands.map((band) => {
      const renderBand: RenderBand = {
        id: band.id,
        label: band.id,
        start: band.start,
        end: band.end + 1,
        color: stainToColor[band.stain],
      };
      return renderBand;
    });

    const chromShape = getChromosomeShape(
      this.ctx,
      style.yPad,
      this.dimensions,
      centromere,
      style.lineColor,
      style.lineColor,
      xScale,
      chromInfo.size,
    );

    drawChromosomeBands(
      this.ctx,
      this.dimensions,
      renderBands,
      xScale,
      chromShape,
      style.yPad,
      style.lineWidth,
    );

    const targets = renderBands.map((band) => {
      return {
        label: band.label,
        box: {
          x1: xScale(band.start),
          x2: xScale(band.end),
          y1: 0,
          y2: this.dimensions.height,
        },
        element: band,
      };
    });
    this.hoverTargets = targets;

    const isZoomed = xRange[0] != 1 || xRange[1] != chromSize;
    renderZoomMarker(this.markerElement, xRange, xScale, isZoomed);
  }
}

function renderZoomMarker(
  markerElement: HTMLDivElement,
  xRange: [number, number],
  xScale: Scale,
  isZoomed: boolean,
) {

  // Hide if not zoomed
  const hideMarker = !isZoomed;
  markerElement.hidden = hideMarker;
  if (!hideMarker) {
    const pxStart = Math.floor(xScale(xRange[0]));
    const pxEnd = Math.floor(xScale(xRange[1]));
    const pxWidth = pxEnd - pxStart;

    markerElement.style.left = `${pxStart}px`;
    markerElement.style.width = `${pxWidth}px`;
  }
}

function setupZoomMarkerElement(trackHeight: number): HTMLDivElement {
  const markerElement = document.createElement("div");
  markerElement.id = "ideogram-marker";
  markerElement.className = "marker";

  const style = STYLE.ideogramMarker;
  const colors = STYLE.colors;

  markerElement.style.position = "absolute";
  markerElement.style.backgroundColor = colors.transparentYellow;

  markerElement.style.border = "none";
  markerElement.style.outline = "none";

  markerElement.style.boxShadow = [
    `inset ${style.borderWidth}px 0 0 ${colors.red}`,
    `inset -${style.borderWidth}px 0 0 ${colors.red}`,
  ].join(", ");
  markerElement.style.boxSizing = "border-box";

  markerElement.hidden = true;

  markerElement.style.height = `${trackHeight}px`;
  markerElement.style.width = "0px";
  markerElement.style.top = "0px";
  markerElement.style.left = `${style.leftMargin}px`;

  markerElement.style.pointerEvents = "none";

  return markerElement;
}

customElements.define("ideogram-track", IdeogramTrack);
