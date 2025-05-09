import { drawChromosomeBands, getChromosomeShape } from "../../draw/ideogram";
import { STYLE } from "../../constants";
import { CanvasTrack } from "./base_tracks/canvas_track";
import "tippy.js/dist/tippy.css";
import { getLinearScale } from "../../draw/render_utils";

export class IdeogramTrack extends CanvasTrack {
  private markerElement: HTMLDivElement;

  private renderData: IdeogramTrackData;
  private getRenderData: () => Promise<IdeogramTrackData>;

  constructor(
    id: string,
    label: string,
    trackHeight: number,
    getRenderData: () => Promise<IdeogramTrackData>,
  ) {
    super(id, label, trackHeight);
    this.getRenderData = getRenderData;
  }

  connectedCallback(): void {
    super.connectedCallback();
    const zoomMarkerElement = setupZoomMarkerElement(this.defaultTrackHeight);
    this.trackContainer.appendChild(zoomMarkerElement);
    this.markerElement = zoomMarkerElement;

    this.initializeHoverTooltip();
  }

  async render(settings: RenderSettings) {

    if (settings.dataUpdated || this.renderData == null) {
      this.renderData = await this.getRenderData();
    }

    super.syncDimensions();
    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);

    const { chromInfo, xRange } = this.renderData;

    const style = STYLE.ideogramTrack;

    const xScale = getLinearScale(
      [1, chromInfo.size],
      [style.xPad, this.dimensions.width - style.xPad],
    );

    let centromere = null;
    if (chromInfo.centromere !== null) {
      const start = Math.round(xScale(chromInfo.centromere.start));
      const end = Math.round(xScale(chromInfo.centromere.end));
      centromere = {
        start,
        end,
        center: (start + end) / 2
      };
    }

    const stainToColor = STYLE.ideogramTrack.stainToColor;
    const renderBands = chromInfo.bands.map((band) => {
      return {
        id: band.id,
        label: band.id,
        start: xScale(band.start),
        end: xScale(band.end),
        color: stainToColor[band.stain],
      };
    });

    const chromShape = getChromosomeShape(
      this.ctx,
      style.yPad,
      this.dimensions,
      centromere,
      style.lineColor,
      style.lineColor,
      xScale,
      chromInfo.size
    );

    drawChromosomeBands(
      this.ctx,
      this.dimensions,
      renderBands,
      chromShape,
      style.yPad,
      style.lineWidth
    );

    const targets = renderBands.map((band) => {
      return {
        label: band.label,
        box: {
          x1: band.start,
          x2: band.end,
          y1: 0,
          y2: this.dimensions.height,
        },
      };
    });
    this.hoverTargets = targets;

    this.renderZoomMarker(xRange, chromInfo.size, xScale);
  }

  renderZoomMarker(xRange: [number, number], chromSize: number, xScale: Scale) {
    const markerElement = this.markerElement;

    // Hide if not zoomed
    const hideMarker = xRange[0] == 1 && xRange[1] == chromSize;
    markerElement.hidden = hideMarker;
    if (!hideMarker) {
      const pxStart = xScale(xRange[0]);
      const pxEnd = xScale(xRange[1]);
      const pxWidth = pxEnd - pxStart;

      markerElement.style.width = `${pxWidth}px`;
      markerElement.style.marginLeft = `${pxStart}px`;
    }
  }
}

function setupZoomMarkerElement(trackHeight: number): HTMLDivElement {
  const markerElement = document.createElement("div");
  markerElement.id = "ideogram-marker";
  markerElement.className = "marker";

  const leftMargin = STYLE.ideogramMarker.leftMargin;

  markerElement.style.position = "absolute";
  markerElement.style.backgroundColor = STYLE.colors.transparentYellow;

  const bw = STYLE.ideogramMarker.borderWidth;
  markerElement.style.borderLeft = `${bw}px solid ${STYLE.colors.red}`;
  markerElement.style.borderRight = `${bw}px solid ${STYLE.colors.red}`;

  markerElement.style.height = `${trackHeight - bw}px`;
  markerElement.style.width = "0px";
  markerElement.style.top = "0px";
  markerElement.style.marginLeft = `${leftMargin}px`;

  markerElement.style.pointerEvents = "none";

  return markerElement;
}

customElements.define("ideogram-track", IdeogramTrack);
