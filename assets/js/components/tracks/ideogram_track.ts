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
      console.log("Clicked band!", band);
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

    // console.log(chromInfo);

    // const chromInfoBands = chromInfo.bands.sort((b1, b2) => b1.start < b2.start ? -1 : 1).slice(0, 2);
    // const chromInfoBands = chromInfo.bands.slice(0, 5);

    const chromInfoBands = [
      {
        id: "id1",
        stain: "gneg",
        start: 1,
        end: 1,
      },
      {
        id: "id2",
        stain: "gpos25",
        start: 2,
        end: 2,
      },
      {
        id: "id3",
        stain: "gpos75",
        start: 3,
        end: 3,
      },
    ];

    console.log(chromInfoBands);

    const calculatedSize = sumArray(
      chromInfoBands.map((band) => band.end - band.start + 1),
    ) + 1;

    console.log("Calculated size", calculatedSize);

    const style = STYLE.ideogramTrack;

    const xScale = getLinearScale(
      [1, calculatedSize],
      [style.xPad, this.dimensions.width - style.xPad],
    );

    let centromere = null;
    // if (chromInfo.centromere !== null) {
    //   const start = Math.round(xScale(chromInfo.centromere.start));
    //   const end = Math.round(xScale(chromInfo.centromere.end));
    //   centromere = {
    //     start,
    //     end,
    //     center: (start + end) / 2,
    //   };
    // }

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

    console.log("Render bands", renderBands);

    // const chromShape = getChromosomeShape(
    //   this.ctx,
    //   style.yPad,
    //   this.dimensions,
    //   centromere,
    //   style.lineColor,
    //   style.lineColor,
    //   xScale,
    //   chromInfo.size,
    // );

    drawChromosomeBands(
      this.ctx,
      this.dimensions,
      renderBands,
      xScale,
      null,
      // chromShape,
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

    renderZoomMarker(this.markerElement, xRange, calculatedSize, xScale);
  }
}

function renderZoomMarker(
  markerElement: HTMLDivElement,
  xRange: [number, number],
  chromSize: number,
  xScale: Scale,
) {
  console.log("Rendering range:", xRange);

  console.log("xRange", xRange);

  // Hide if not zoomed
  const hideMarker = xRange[0] == 1 && xRange[1] == chromSize;
  markerElement.hidden = hideMarker;
  if (!hideMarker) {
    const pxStart = xScale(xRange[0]);
    const pxEnd = xScale(xRange[1] + 1);
    const pxWidth = pxEnd - pxStart;

    console.log("Scaled", pxStart, pxEnd, pxWidth);

    markerElement.style.width = `${pxWidth}px`;
    markerElement.style.marginLeft = `${pxStart}px`;
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

  markerElement.hidden = true;

  markerElement.style.height = `${trackHeight - bw}px`;
  markerElement.style.width = "0px";
  markerElement.style.top = "0px";
  markerElement.style.marginLeft = `${leftMargin}px`;

  markerElement.style.pointerEvents = "none";

  return markerElement;
}

customElements.define("ideogram-track", IdeogramTrack);
