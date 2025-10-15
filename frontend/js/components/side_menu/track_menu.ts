import { COLORS, ICONS, SIZES } from "../../constants";
import { populateSelect } from "../../util/utils";
import { ShadowBaseElement } from "../util/shadowbaseelement";

const template = document.createElement("template");
template.innerHTML = String.raw`
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    /* Insist to hide even if display: flex if "hidden" is set */
    :host [hidden] {
      display: none !important;
    }
    .row {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: nowrap;
      white-space: nowrap;
      padding-top: ${SIZES.s}px;
      gap: ${SIZES.xxs}px;
    }
    #buttons {
      flex-wrap: nowrap;
      gap: ${SIZES.s}px;
    }
    #y-axis {

    }
    #y-axis input {
      flex: 1 1 0px;
      min-width: 0;
    }
    #colors {
      justify-content: space-between;
    }
    #color-select {
      background-color: ${COLORS.white};
    }
    .button {
      cursor: pointer;
      /* FIXME: Style constants */
      border: 1px solid #ccc;
      padding: 4px 8px;
      borderRadius: 4px;
    }
  </style>
  <div id="actions" class="row">
    <div id="move-up" label="Move up" class="button fas ${ICONS.up}"></div>
    <div id="move-down" label="Move down" class="button fas ${ICONS.down}"></div>
    <div id="toggle-hide" label="Show / hide" class="button fas ${ICONS.show}"></div>
    <div id="toggle-collapse" label="Collapse / expand" class="button fas ${ICONS.expand}"></div>
  </div>
  <!-- FIXME: Disabled for now. Is the global setting enough? -->
  <!-- <div id="y-axis" class="row">
    <div>Y-axis: </div>
    <input id="y-axis-start" type="number" step="0.1">
    <input id="y-axis-end" type="number" step="0.1">
  </div> -->
  <div id="colors" class="row">
    <div>Color by: </div>
    <select id="color-select">
  </div>
`;

interface TrackPageSettings {
  showYAxis: boolean;
  showColor: boolean;
}

export class TrackMenu extends ShadowBaseElement {
  isInitialized: boolean = false;

  private _trackId: string;
  private settings: TrackPageSettings;
  private getAnnotationSources: GetAnnotSources;

  private getIsHidden: () => boolean;
  private getIsCollapsed: () => boolean;

  private yAxis: HTMLDivElement;
  private colors: HTMLDivElement;
  private yAxisStart: HTMLSelectElement;
  private yAxisEnd: HTMLSelectElement;
  private colorSelect: HTMLSelectElement;

  private moveUp: HTMLDivElement;
  private moveDown: HTMLDivElement;
  private toggleHide: HTMLDivElement;
  private toggleCollapse: HTMLDivElement;

  constructor() {
    super(template);
  }

  // Before being connected to the DOM
  configure(trackId: string, settings: TrackPageSettings) {
    this._trackId = trackId;
    this.settings = settings;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.yAxis = this.root.querySelector("#y-axis");
    this.colors = this.root.querySelector("#colors");

    this.yAxisStart = this.root.querySelector("#y-axis-start");
    this.yAxisEnd = this.root.querySelector("#y-axis-end");
    this.colorSelect = this.root.querySelector("#color-select");

    this.moveUp = this.root.querySelector("#move-up");
    this.moveDown = this.root.querySelector("#move-down");
    this.toggleHide = this.root.querySelector("#toggle-hide");
    this.toggleCollapse = this.root.querySelector("#toggle-collapse");

    this.yAxis.hidden = !this.settings.showYAxis;
    this.colors.hidden = !this.settings.showColor;
  }

  // After being connected to the DOM
  initialize(
    getBandTracks: GetAnnotSources,
    moveTrack: (direction: "up" | "down") => void,
    toggleHidden: () => void,
    toggleCollapsed: () => void,
    getIsHidden: () => boolean,
    getIsCollapsed: () => boolean,
    getYAxis: (() => Rng) | null,
    setYAxis: (newAxis: Rng) => void,
    onColorSelected: (annotId: string) => void,
  ) {
    if (!this.isConnected) {
      throw Error("Must be connected before being initialized");
    }

    this.getIsHidden = getIsHidden;
    this.getIsCollapsed = getIsCollapsed;

    if (this.settings.showColor && !this.isInitialized) {
      const annotSources = getBandTracks({ selectedOnly: false });
      populateSelect(this.colorSelect, annotSources, true);
    }

    if (this.settings.showYAxis) {
      const currY = getYAxis();
      this.yAxisStart.value = currY[0].toString();
      this.yAxisEnd.value = currY[1].toString();
    }

    this.moveUp.addEventListener(
      "click",
      () => {
        moveTrack("up");
      },
      { signal: this.getListenerAbortSignal() },
    );
    this.moveDown.addEventListener(
      "click",
      () => {
        moveTrack("down");
      },
      { signal: this.getListenerAbortSignal() },
    );
    this.toggleHide.addEventListener(
      "click",
      () => {
        toggleHidden();
      },
      { signal: this.getListenerAbortSignal() },
    );
    this.toggleCollapse.addEventListener(
      "click",
      () => {
        toggleCollapsed();
      },
      { signal: this.getListenerAbortSignal() },
    );

    if (this.settings.showYAxis) {
      const getCurrRange = (): Rng => {
        return [
          parseFloat(this.yAxisStart.value),
          parseFloat(this.yAxisEnd.value),
        ];
      };

      this.yAxisStart.addEventListener("change", () => {
        setYAxis(getCurrRange());
      });
      this.yAxisEnd.addEventListener("change", () => {
        setYAxis(getCurrRange());
      });
    }

    if (this.settings.showColor) {
      this.colorSelect.addEventListener("change", () => {
        const id = this.colorSelect.value || null;
        onColorSelected(id);
      });
    }

    this.isInitialized = true;
  }

  render(_settings: RenderSettings) {
    const hideIcon = this.getIsHidden() ? ICONS.hide : ICONS.show;
    this.toggleHide.classList = `button fas ${hideIcon}`;

    const collapseIcon = this.getIsCollapsed() ? ICONS.collapse : ICONS.expand;
    this.toggleCollapse.classList = `button fas ${collapseIcon}`;
  }
}

customElements.define("track-page", TrackMenu);
